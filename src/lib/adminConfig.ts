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

// Phase 6 (supabase/migrations/0021_ops_console_admin_visibility.sql):
// read-only cross-user visibility into the App/ domains added in
// 0018-0020, plus the one mutation those screens use (resolve_expense_report,
// 0019, password-gated like every other admin write).

export interface AdminExpenseReport {
  id: string; title: string; amount: number; currency: string; category: string; status: string;
  employeeName: string | null; project: string | null; submittedAt: string; userName: string | null; userEmail: string | null;
}

export async function adminListExpenseReports(): Promise<AdminExpenseReport[]> {
  const res = await supabase.rpc("admin_list_expense_reports");
  return mustHaveData(res, "adminListExpenseReports").map((r: Record<string, unknown>) => ({
    id: r.id as string, title: r.title as string, amount: Number(r.amount), currency: r.currency as string,
    category: r.category as string, status: r.status as string, employeeName: (r.employee_name as string) ?? null,
    project: (r.project as string) ?? null, submittedAt: r.submitted_at as string,
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null,
  }));
}

export async function adminResolveExpenseReport(args: { reportId: string; status: "approved" | "rejected"; password: string }): Promise<void> {
  const res = await supabase.rpc("resolve_expense_report", {
    p_report_id: args.reportId, p_status: args.status, p_admin_password: args.password,
  });
  mustHaveData(res, "adminResolveExpenseReport");
}

export interface AdminCorporateCard {
  id: string; holderName: string; role: string; limitAmount: number; spentAmount: number; currency: string;
  createdAt: string; ownerName: string | null; ownerEmail: string | null;
}

export async function adminListCorporateCards(): Promise<AdminCorporateCard[]> {
  const res = await supabase.rpc("admin_list_corporate_cards");
  return mustHaveData(res, "adminListCorporateCards").map((r: Record<string, unknown>) => ({
    id: r.id as string, holderName: r.holder_name as string, role: r.role as string, limitAmount: Number(r.limit_amount),
    spentAmount: Number(r.spent_amount), currency: r.currency as string, createdAt: r.created_at as string,
    ownerName: (r.owner_name as string) ?? null, ownerEmail: (r.owner_email as string) ?? null,
  }));
}

export interface AdminLoyaltyAccount {
  id: string; venueName: string; venueCategory: string; points: number; currency: string;
  monthlySpend: number; cashbackRate: number; userName: string | null; userEmail: string | null;
}

export async function adminListLoyaltyAccounts(): Promise<AdminLoyaltyAccount[]> {
  const res = await supabase.rpc("admin_list_loyalty_accounts");
  return mustHaveData(res, "adminListLoyaltyAccounts").map((r: Record<string, unknown>) => ({
    id: r.id as string, venueName: r.venue_name as string, venueCategory: r.venue_category as string, points: Number(r.points),
    currency: r.currency as string, monthlySpend: Number(r.monthly_spend), cashbackRate: Number(r.cashback_rate),
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null,
  }));
}

export interface AdminGameBet {
  id: string; kind: string; stakeAmount: number; currency: string; status: string; payoutAmount: number | null;
  placedAt: string; resolvedAt: string | null; userName: string | null; userEmail: string | null;
}

export async function adminListGameBets(): Promise<AdminGameBet[]> {
  const res = await supabase.rpc("admin_list_game_bets");
  return mustHaveData(res, "adminListGameBets").map((r: Record<string, unknown>) => ({
    id: r.id as string, kind: r.kind as string, stakeAmount: Number(r.stake_amount), currency: r.currency as string,
    status: r.status as string, payoutAmount: r.payout_amount == null ? null : Number(r.payout_amount),
    placedAt: r.placed_at as string, resolvedAt: (r.resolved_at as string) ?? null,
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null,
  }));
}

export interface AdminTontineMember {
  circleId: string; circleName: string; memberPosition: number; joinedAt: string; userName: string | null; userEmail: string | null;
}

export async function adminListTontineMembers(): Promise<AdminTontineMember[]> {
  const res = await supabase.rpc("admin_list_tontine_members");
  return mustHaveData(res, "adminListTontineMembers").map((r: Record<string, unknown>) => ({
    circleId: r.circle_id as string, circleName: r.circle_name as string, memberPosition: Number(r.member_position),
    joinedAt: r.joined_at as string, userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null,
  }));
}

export interface AdminPitchSubmission {
  id: string; title: string; category: string | null; goal: number; raised: number; currency: string; risk: string;
  createdAt: string; ownerName: string | null; ownerEmail: string | null;
}

export async function adminListPitchSubmissions(): Promise<AdminPitchSubmission[]> {
  const res = await supabase.rpc("admin_list_pitch_submissions");
  return mustHaveData(res, "adminListPitchSubmissions").map((r: Record<string, unknown>) => ({
    id: r.id as string, title: r.title as string, category: (r.category as string) ?? null, goal: Number(r.goal),
    raised: Number(r.raised), currency: r.currency as string, risk: r.risk as string, createdAt: r.created_at as string,
    ownerName: (r.owner_name as string) ?? null, ownerEmail: (r.owner_email as string) ?? null,
  }));
}
