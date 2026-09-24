// Remittance corridor guardrails (supabase/migrations/0033_remittance_corridor_guardrails.sql).
// Authorisation is enforced in the database: suspend/resume needs transactions:update,
// repricing needs an admin-tier account; the UI only hides what the caller cannot do.
import { supabase } from "./supabase-client.ts";

export interface Corridor {
  from: string; to: string; enabled: boolean; suspendedReason: string | null; marginOverride: number | null; appliedMargin: number | null;
  payoutCostEur: number; processingCostEur: number; payinCostEur: number; riskCostEur: number; floorEur: number; minAmount: number;
  refAmount: number | null; refContributionEur: number | null; refBlockedReason: string | null;
  orders30d: number; volume30d: number; avgContribution30d: number | null;
  flatFeeOverride: number | null; percentFeeOverride: number | null; refFee: number | null;
}
export interface CorridorEvent { from: string; to: string; action: string; detail: Record<string, unknown>; createdAt: string }

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function listCorridors(): Promise<Corridor[]> {
  const res = await supabase.rpc("admin_corridor_overview");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    from: r.from_currency as string, to: r.to_currency as string, enabled: r.enabled as boolean, suspendedReason: (r.suspended_reason as string) ?? null,
    marginOverride: num(r.margin_override), appliedMargin: num(r.applied_margin), payoutCostEur: Number(r.payout_cost_eur),
    processingCostEur: Number(r.processing_cost_eur), payinCostEur: Number(r.payin_cost_eur), riskCostEur: Number(r.risk_cost_eur),
    floorEur: Number(r.min_contribution_eur), minAmount: Number(r.min_amount), refAmount: num(r.ref_amount), refContributionEur: num(r.ref_contribution_eur),
    refBlockedReason: (r.ref_blocked_reason as string) ?? null, orders30d: Number(r.orders_30d), volume30d: Number(r.volume_30d), avgContribution30d: num(r.avg_contribution_30d),
    flatFeeOverride: num(r.flat_fee_override), percentFeeOverride: num(r.percent_fee_override), refFee: num(r.ref_fee),
  }));
}

export async function listCorridorEvents(limit = 10): Promise<CorridorEvent[]> {
  const res = await supabase.rpc("admin_corridor_events", { p_limit: limit });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    from: r.from_currency as string, to: r.to_currency as string, action: r.action as string, detail: (r.detail as Record<string, unknown>) ?? {}, createdAt: r.created_at as string,
  }));
}

export async function setCorridorStatus(from: string, to: string, enabled: boolean, reason?: string): Promise<void> {
  const res = await supabase.rpc("admin_set_corridor_status", { p_from: from, p_to: to, p_enabled: enabled, p_reason: reason ?? null });
  if (res.error) throw new Error(res.error.message);
}

export interface FeeVersion { flatFeeEur: number; percentFee: number | null; effectivePercent: number; decider: string; note: string | null; createdAt: string }

// Remittance fee (migration 0034): flat EUR fee + optional percentage; percentFee null = global commission.
export async function listFeeHistory(limit = 6): Promise<FeeVersion[]> {
  const res = await supabase.rpc("admin_remittance_fee_history", { p_limit: limit });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    flatFeeEur: Number(r.flat_fee_eur), percentFee: num(r.percent_fee), effectivePercent: Number(r.effective_percent),
    decider: r.decider as string, note: (r.note as string) ?? null, createdAt: r.created_at as string,
  }));
}

export async function setRemittanceFee(flatFeeEur: number, percentFee: number | null, note?: string): Promise<void> {
  const res = await supabase.rpc("admin_set_remittance_fee", { p_flat_fee_eur: flatFeeEur, p_percent_fee: percentFee, p_note: note ?? null });
  if (res.error) throw new Error(res.error.message);
}

export interface CorridorPricing {
  marginRate: number | null; payoutCostEur: number; processingCostEur: number; payinCostEur: number; riskCostEur: number;
  floorEur: number; minAmount: number; maxAmount: number | null;
  /** Per-corridor fee overrides; null = inherit the global remittance fee. */
  flatFeeEur: number | null; percentFee: number | null;
}

export async function upsertCorridor(from: string, to: string, p: CorridorPricing): Promise<void> {
  const res = await supabase.rpc("admin_upsert_corridor", {
    p_from: from, p_to: to, p_margin_rate: p.marginRate, p_payout_cost_eur: p.payoutCostEur, p_processing_cost_eur: p.processingCostEur,
    p_payin_cost_eur: p.payinCostEur, p_risk_cost_eur: p.riskCostEur, p_min_contribution_eur: p.floorEur, p_min_amount: p.minAmount, p_max_amount: p.maxAmount, p_flat_fee_eur: p.flatFeeEur, p_percent_fee: p.percentFee,
  });
  if (res.error) throw new Error(res.error.message);
}
