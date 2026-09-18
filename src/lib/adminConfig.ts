// Thin wrappers around the same RPCs/views App/src/lib/backend.ts's FX-config
// and blocked-transfer/pending-profile sections use (same Supabase project,
// same schema, supabase/migrations/0013_fx_margin_config_and_live_rates.sql)
// — duplicated rather than shared for the same reason as identity.ts (ops-
// console is a separate package with no way to import App's TS directly).
// The live-rate refresh has no RPC of its own — it's a Convex action — so it
// goes through the same "no Convex client here" HTTP-route pattern already
// established by kycUpload.ts, hitting App's shared Convex deployment.
import { supabase } from "./supabase-client.ts";

function mustHaveData<T>(res: { data: T | null; error: { message: string } | null }, label: string): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${label}: expected data, got null`);
  return res.data;
}

export interface FxMarginConfig {
  id: string;
  marginRate: number;
  commissionRate: number;
  decider: string;
  note: string | null;
}

function toFxMarginConfig(row: Record<string, unknown>): FxMarginConfig {
  return {
    id: row.id as string,
    marginRate: Number(row.margin_rate),
    commissionRate: Number(row.commission_rate),
    decider: row.decider as string,
    note: (row.note as string) ?? null,
  };
}

export async function getCurrentFxMarginConfig(): Promise<FxMarginConfig | null> {
  const res = await supabase.from("fx_margin_config_current").select("*").maybeSingle();
  if (res.error) throw new Error(`getCurrentFxMarginConfig: ${res.error.message}`);
  return res.data ? toFxMarginConfig(res.data as Record<string, unknown>) : null;
}

export async function updateFxMarginConfig(args: {
  marginRate: number; commissionRate: number; decider: string; note?: string; password: string;
}): Promise<FxMarginConfig> {
  const res = await supabase.rpc("update_fx_margin_config", {
    p_margin_rate: args.marginRate, p_commission_rate: args.commissionRate,
    p_decider: args.decider, p_note: args.note ?? null, p_password: args.password,
  });
  return toFxMarginConfig(mustHaveData(res, "updateFxMarginConfig") as Record<string, unknown>);
}

export interface FxRateUpdate {
  source: string;
  currenciesUpdated: number;
  fetchedAt: string;
}

export async function getLastFxRateUpdate(): Promise<FxRateUpdate | null> {
  const res = await supabase.from("fx_rate_updates").select("*").order("fetched_at", { ascending: false }).limit(1).maybeSingle();
  if (res.error) throw new Error(`getLastFxRateUpdate: ${res.error.message}`);
  const row = res.data as Record<string, unknown> | null;
  return row ? { source: row.source as string, currenciesUpdated: row.currencies_updated as number, fetchedAt: row.fetched_at as string } : null;
}

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;

export async function refreshLiveFxRates(): Promise<{ updated: number; source: string; error?: string }> {
  if (!CONVEX_SITE_URL) return { updated: 0, source: "none", error: "VITE_CONVEX_SITE_URL not configured" };
  const res = await fetch(`${CONVEX_SITE_URL}/refreshFxRates`, { method: "POST" });
  return (await res.json()) as { updated: number; source: string; error?: string };
}

export interface BlockedTransfer {
  transferId: string;
  reference: string;
  state: string;
  amount: number;
  currency: string;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
}

export async function adminListBlockedTransfers(): Promise<BlockedTransfer[]> {
  const res = await supabase.rpc("admin_list_blocked_transfers");
  return mustHaveData(res, "adminListBlockedTransfers").map((r: Record<string, unknown>) => ({
    transferId: r.transfer_id as string, reference: r.reference as string, state: r.state as string,
    amount: Number(r.amount), currency: r.currency as string,
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null, createdAt: r.created_at as string,
  }));
}

export async function adminResolveTransfer(args: {
  transferId: string; newState: string; reason?: string; password: string;
}): Promise<void> {
  const res = await supabase.rpc("admin_resolve_transfer", {
    p_transfer_id: args.transferId, p_new_state: args.newState, p_reason: args.reason ?? null, p_password: args.password,
  });
  mustHaveData(res, "adminResolveTransfer");
}

export interface PendingProfile {
  roleId: string;
  userId: string;
  role: string;
  status: string;
  kind: string;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
}

export async function adminListPendingProfiles(): Promise<PendingProfile[]> {
  const res = await supabase.rpc("admin_list_pending_profiles");
  return mustHaveData(res, "adminListPendingProfiles").map((r: Record<string, unknown>) => ({
    roleId: r.role_id as string, userId: r.user_id as string, role: r.role as string, status: r.status as string, kind: r.kind as string,
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null, createdAt: r.created_at as string,
  }));
}

export async function adminActivateProfile(roleId: string): Promise<void> {
  const res = await supabase.rpc("admin_update_user_role", { p_role_id: roleId, p_status: "verified" });
  mustHaveData(res, "adminActivateProfile");
}
