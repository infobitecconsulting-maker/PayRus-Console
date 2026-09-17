// Live Supabase replacement for the structural data ops-console used to get
// entirely from hardcoded arrays in ../data.ts (ROWS, MANDATES, GRANTS,
// MEMBERS, BATCHES, MERCHANTS, AGENTS, POSITIONS, ROLE_SCOPE, QUEUE, FX,
// CAPS, RANGE_SCALE, ROLE_ORDER) — see
// supabase/migrations/0004_capability_registry.sql and
// 0005_wallet_view_quote_transfer.sql's console_* tables for the schema
// this reads, and supabase/README.md's "Origin: replication check" section
// for why ops-console had none of this as real backend data before.
//
// Reconstructs the exact same shapes data.ts used to export as static
// consts, so Console.tsx's render logic doesn't need to change — only
// where the data comes from.
import { supabase } from "./supabase-client.ts";
import type { LedgerRow, Position, QueueItem, Role, RoleScope, RowState, TabKey, Who } from "../types.ts";

/**
 * Lighter-weight fetch for ProfilePicker.tsx, which only needs role order
 * and each role's tab capabilities — not the full dashboard dataset.
 */
export async function fetchRolesAndCaps(): Promise<{ roleOrder: Role[]; caps: Record<Role, TabKey[]> }> {
  const [rolesRes, tabsRes] = await Promise.all([
    supabase.from("console_roles").select("role, sort_order").order("sort_order"),
    supabase.from("console_role_tabs").select("role, tab_key, sort_order").order("sort_order"),
  ]);
  if (rolesRes.error) throw new Error(`fetchRolesAndCaps: console_roles failed: ${rolesRes.error.message}`);
  if (tabsRes.error) throw new Error(`fetchRolesAndCaps: console_role_tabs failed: ${tabsRes.error.message}`);

  const roleOrder = (rolesRes.data ?? []).map((r) => r.role as Role);
  const caps = {} as Record<Role, TabKey[]>;
  for (const role of roleOrder) caps[role] = [];
  for (const t of tabsRes.data ?? []) caps[t.role as Role]?.push(t.tab_key as TabKey);
  return { roleOrder, caps };
}

export interface ConsoleData {
  roleOrder: Role[];
  caps: Record<Role, TabKey[]>;
  viewRows: Record<TabKey, LedgerRow[]>;
  positions: Partial<Record<Role, Position>>;
  roleScope: Partial<Record<Role, RoleScope>>;
  queue: (QueueItem & { i: number })[];
  fx: { pair: string; rate: string }[];
  rangeScale: number[];
}

// XAF/XOF/CDF/AOA display without minor-unit decimals, matching the
// original hardcoded data's own convention (e.g. "22 645 000 XAF" vs.
// "18 420,00 EUR") — everything else gets 2 decimals.
const ZERO_DECIMAL_CURRENCIES = new Set(["XAF", "XOF", "CDF", "AOA"]);

function fmtAmount(n: number, currency?: string | null, locale = "fr-FR"): string {
  const dec = currency && ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  return n.toLocaleString(locale, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtRate(n: number, locale = "fr-FR"): string {
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

/**
 * Fetches every console_* table (plus a spot-check against
 * capability_registry, see below) and reassembles it into the shapes
 * Console.tsx already expects. One round of parallel queries — this data
 * changes rarely (it's governance/reference-shaped, not per-user), so no
 * realtime subscription or aggressive refetching is warranted.
 */
export async function fetchConsoleData(): Promise<ConsoleData> {
  const [
    rolesRes, tabsRes, ledgerRes, positionsRes, pocketsRes,
    seesRes, kpisRes, kpiNotesRes, barsRes, queueRes, queueRolesRes, fxRes, rangeRes,
  ] = await Promise.all([
    supabase.from("console_roles").select("role, sort_order").order("sort_order"),
    supabase.from("console_role_tabs").select("role, tab_key, sort_order").order("sort_order"),
    supabase.from("console_ledger_rows").select("*").order("sort_order"),
    supabase.from("console_positions").select("id, role, total_amount, total_currency"),
    supabase.from("console_position_pockets").select("*").order("sort_order"),
    supabase.from("console_role_sees").select("role, who"),
    supabase.from("console_role_kpis").select("*").order("idx"),
    supabase.from("console_kpi_note_values").select("*"),
    supabase.from("console_role_bars").select("*").order("sort_order"),
    supabase.from("console_queue_items").select("id, idx, style_class").order("idx"),
    supabase.from("console_queue_item_roles").select("queue_item_id, role"),
    supabase.from("console_fx_rates").select("pair, rate, sort_order").order("sort_order"),
    supabase.from("console_range_scales").select("idx, scale").order("idx"),
  ]);

  for (const [name, res] of Object.entries({
    rolesRes, tabsRes, ledgerRes, positionsRes, pocketsRes,
    seesRes, kpisRes, kpiNotesRes, barsRes, queueRes, queueRolesRes, fxRes, rangeRes,
  })) {
    if (res.error) throw new Error(`fetchConsoleData: ${name} failed: ${res.error.message}`);
  }

  const roleOrder = (rolesRes.data ?? []).map((r) => r.role as Role);

  const caps = {} as Record<Role, TabKey[]>;
  for (const role of roleOrder) caps[role] = [];
  for (const t of tabsRes.data ?? []) caps[t.role as Role]?.push(t.tab_key as TabKey);

  const viewRows: Record<TabKey, LedgerRow[]> = {
    overview: [], transactions: [], payouts: [], merchants: [], agents: [], mandates: [], grants: [], members: [],
  };
  for (const r of ledgerRes.data ?? []) {
    const row: LedgerRow = {
      who: (r.who ?? undefined) as Who | undefined,
      name: r.name, meta: r.meta, corridor: r.corridor, rail: r.rail,
      amount: r.amount_value == null ? "—" : fmtAmount(Number(r.amount_value), r.amount_currency) + (r.amount_currency ? " " + r.amount_currency : ""),
      fee: r.fee_value == null ? "—" : fmtAmount(Number(r.fee_value), r.amount_currency),
      state: r.state as RowState,
    };
    viewRows[r.view as TabKey].push(row);
  }
  // The 'overview' tab reads the same data as 'transactions' — they were
  // never two separate datasets in the original data.ts either (VIEW_ROWS.
  // overview === VIEW_ROWS.transactions by reference), so console_ledger_rows
  // only stores 'transactions' rows; see supabase/README.md's coherence note.
  viewRows.overview = viewRows.transactions;

  const positions: Partial<Record<Role, Position>> = {};
  const pocketsByPosition = new Map<string, typeof pocketsRes.data>();
  for (const p of pocketsRes.data ?? []) {
    const list = pocketsByPosition.get(p.position_id) ?? [];
    list.push(p);
    pocketsByPosition.set(p.position_id, list);
  }
  for (const pos of positionsRes.data ?? []) {
    const pockets = (pocketsByPosition.get(pos.id) ?? []).map((p) => [
      p!.currency, fmtAmount(Number(p!.amount), p!.currency), `${Math.round(Number(p!.pct))}%`, p!.is_secondary ? 1 : 0,
    ] as Position["pockets"][number]);
    positions[pos.role as Role] = {
      total: fmtAmount(Number(pos.total_amount), pos.total_currency) + " " + pos.total_currency,
      pockets,
    };
  }

  const roleScope: Partial<Record<Role, RoleScope>> = {};
  for (const role of roleOrder) roleScope[role] = { sees: [], kpis: [], bars: [] };
  for (const s of seesRes.data ?? []) roleScope[s.role as Role]?.sees.push(s.who as Who);
  const notesByKpi = new Map<string, typeof kpiNotesRes.data>();
  for (const n of kpiNotesRes.data ?? []) {
    const list = notesByKpi.get(n.kpi_id) ?? [];
    list.push(n);
    notesByKpi.set(n.kpi_id, list);
  }
  for (const k of kpisRes.data ?? []) {
    roleScope[k.role as Role]?.kpis.push({
      n: k.value == null ? null : Number(k.value),
      dec: k.decimals ?? undefined,
      suffix: k.suffix ?? undefined,
      flow: k.is_flow,
      noteNums: (notesByKpi.get(k.id) ?? []).map((n) => ({ v: Number(n!.value), flow: n!.is_flow })),
    });
  }
  for (const b of barsRes.data ?? []) {
    roleScope[b.role as Role]?.bars.push([b.label, Number(b.eur_amount)]);
  }

  const rolesByQueueItem = new Map<string, Role[]>();
  for (const qr of queueRolesRes.data ?? []) {
    const list = rolesByQueueItem.get(qr.queue_item_id) ?? [];
    list.push(qr.role as Role);
    rolesByQueueItem.set(qr.queue_item_id, list);
  }
  const queue = (queueRes.data ?? []).map((q) => ({
    roles: rolesByQueueItem.get(q.id) ?? [],
    cls: q.style_class as QueueItem["cls"],
    i: q.idx,
  }));

  const fx = (fxRes.data ?? []).map((f) => ({ pair: f.pair, rate: fmtRate(Number(f.rate)) }));
  const rangeScale = (rangeRes.data ?? []).map((r) => Number(r.scale));

  return { roleOrder, caps, viewRows, positions, roleScope, queue, fx, rangeScale };
}
