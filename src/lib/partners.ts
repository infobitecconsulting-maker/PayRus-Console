// Partner contracts, readiness, integration and pricing policy (migrations 0045-0047).
// Every call is admin-tier in the database; changing the pricing policy needs the superadmin.
import { supabase } from "./supabase-client.ts";

const camelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const camel = <T>(r: Record<string, unknown>): T => Object.fromEntries(Object.entries(r).map(([k, v]) => [camelKey(k), v])) as T;

async function rows<T>(name: string, args?: Record<string, unknown>): Promise<T[]> {
  const res = await supabase.rpc(name, args);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => camel<T>(r));
}
async function call(name: string, args?: Record<string, unknown>): Promise<unknown> {
  const res = await supabase.rpc(name, args);
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export interface ContractRow {
  contractId: string; partnerId: string; partnerName: string; partnerKind: string; reference: string; status: string; live: boolean;
  effectiveFrom: string | null; effectiveTo: string | null; signedAt: string | null; terms: number; agents: number; countries: string[];
  prefundBalance: number; settlementCurrency: string; integrationAdapter: string; integrationStatus: string; offerValidUntil: string | null; queuedRequests: number;
}
export interface TermRow {
  direction: string; country: string; method: string; provider: string | null; flatFee: number; feeCurrency: string; commissionPercent: number; commissionBasis: string;
  senderFlatFeeEur: number | null; senderPercentFee: number | null; fxMargin: number | null; minAmount: number | null; maxAmount: number | null;
  payoutCurrency: string | null; deliveryTime: string | null; partnerFxMargin: number | null; activation: string;
}
export interface ReadinessRow { checkName: string; severity: "blocker" | "warning" | "ok"; message: string }
export interface IntegrationTask { step: string; label: string; stage: string | null; required: boolean; done: boolean; doneAt: string | null; notes: string | null }
export interface PolicyRow {
  id: string; scope: string; country: string | null; method: string | null; objective: string; marginFlatEur: number; marginPercent: number; minFeeEur: number; maxFeeEur: number | null;
  premiumFastEur: number; premiumSameDayEur: number; slaWeightEurPerDay: number; fallbackCostEur: number; roundingStep: number; active: boolean;
}
export interface SimRow {
  partnerName: string; contractReference: string | null; contractStatus: string | null; live: boolean; provider: string | null; deliveryTime: string | null; delayDays: number;
  costEur: number; feeEur: number; score: number; overridden: boolean; source: string; chosen: boolean; objective: string;
}

const nums = <T extends object>(r: T, keys: string[]): T => {
  const o = { ...r } as Record<string, unknown>;
  for (const k of keys) if (o[k] != null) o[k] = Number(o[k]);
  return o as T;
};

export const listPriorities = () => rows<{ contractId: string; routingPriority: number }>("partner_priorities").then((r) => Object.fromEntries(r.map((x) => [x.contractId, Number(x.routingPriority)])) as Record<string, number>);
export const setPriority = (id: string, priority: number, reason: string) => call("partner_set_priority", { p_contract_id: id, p_priority: priority, p_reason: reason });
export const listContracts = () => rows<ContractRow>("partner_list").then((r) => r.map((c) => nums(c, ["prefundBalance", "terms", "agents", "queuedRequests"])));
export const contractTerms = (id: string) => rows<TermRow>("partner_terms", { p_contract_id: id })
  .then((r) => r.map((t) => nums(t, ["flatFee", "commissionPercent", "senderFlatFeeEur", "senderPercentFee", "fxMargin", "minAmount", "maxAmount", "partnerFxMargin"])));
export const contractReadiness = (id: string) => rows<ReadinessRow>("partner_readiness", { p_contract_id: id });
export const integrationTasks = (id: string) => rows<IntegrationTask>("partner_integration_list", { p_contract_id: id });
export const setIntegrationStep = (id: string, step: string, done: boolean) => call("partner_set_integration_step", { p_contract_id: id, p_step: step, p_done: done });
export const setAdapter = (id: string, adapter: string) => call("partner_set_adapter", { p_contract_id: id, p_adapter: adapter });
export const setContractStatus = (id: string, status: string, reason?: string) => call("partner_set_contract_status", { p_contract_id: id, p_status: status, p_reason: reason ?? null });
export const recordPrefund = (id: string, amount: number, reference?: string) => call("partner_record_prefund", { p_contract_id: id, p_amount: amount, p_reference: reference ?? null });
export const setTermActivation = (id: string, t: TermRow, activation: string) =>
  call("partner_set_term_activation", { p_contract_id: id, p_country: t.country, p_method: t.method, p_provider: t.provider, p_activation: activation });
export const listPolicies = () => rows<PolicyRow>("pricing_list_policies").then((r) => r.map((p) => nums(p, ["marginFlatEur", "marginPercent", "minFeeEur", "maxFeeEur", "premiumFastEur", "premiumSameDayEur", "slaWeightEurPerDay", "fallbackCostEur", "roundingStep"])));
export const setPolicy = (p: Omit<PolicyRow, "id" | "active">, reason: string) => call("pricing_set_policy", {
  p_scope: p.scope, p_country: p.country, p_method: p.method, p_objective: p.objective, p_margin_flat_eur: p.marginFlatEur, p_margin_percent: p.marginPercent,
  p_min_fee_eur: p.minFeeEur, p_max_fee_eur: p.maxFeeEur, p_premium_fast_eur: p.premiumFastEur, p_premium_same_day_eur: p.premiumSameDayEur,
  p_sla_weight_eur_per_day: p.slaWeightEurPerDay, p_fallback_cost_eur: p.fallbackCostEur, p_rounding_step: p.roundingStep, p_reason: reason,
});
export const simulatePricing = (country: string, method: string, amountUsd: number) =>
  rows<SimRow>("pricing_simulate", { p_country: country, p_method: method, p_amount_usd: amountUsd, p_provider: null })
    .then((r) => r.map((x) => nums(x, ["delayDays", "costEur", "feeEur", "score"])));
export const importOffer = async (offer: unknown): Promise<{ contractId: string; termsCreated: number; warnings: string[] }> => {
  const r = ((await call("partner_import_offer", { p_offer: offer })) as Record<string, unknown>[])[0];
  return { contractId: r.contract_id as string, termsCreated: Number(r.terms_created), warnings: (r.warnings as string[]) ?? [] };
};

// Payout types (migration 0048): PayRus agent, partner distributor, mobile money, bank remittance.
export interface ChannelTypeRow {
  code: string; label: string; category: string; method: string; agentKind: string | null; costSource: string; active: boolean; sortOrder: number;
  ownCostFlatEur: number; ownCostPercent: number; marginFlatEur: number; marginPercent: number; premiumEur: number; minFeeEur: number | null; maxFeeEur: number | null;
  deliveryTime: string | null; onboardingRequirements: string[]; notes: string | null; countryOverrides: number;
}
export interface ChannelTypeCountryRow {
  code: string; country: string; active: boolean; ownCostFlatEur: number | null; ownCostPercent: number | null; marginFlatEur: number | null; marginPercent: number | null;
  premiumEur: number | null; minFeeEur: number | null; maxFeeEur: number | null; deliveryTime: string | null;
}
export interface ChannelTypeSim { feeEur: number; costEur: number; partnerName: string | null; deliveryTime: string | null; source: string; channelType: string }
const numOrNull = (v: unknown) => (v == null ? null : Number(v));
export const listChannelTypes = () => rows<ChannelTypeRow>("channel_type_list").then((r) => r.map((t) => ({
  ...nums(t, ["sortOrder", "ownCostFlatEur", "ownCostPercent", "marginFlatEur", "marginPercent", "premiumEur", "countryOverrides"]), minFeeEur: numOrNull(t.minFeeEur), maxFeeEur: numOrNull(t.maxFeeEur),
})));
export const setChannelType = (t: Omit<ChannelTypeRow, "countryOverrides">, reason: string) => call("channel_type_set", {
  p_code: t.code, p_label: t.label, p_category: t.category, p_method: t.method, p_agent_kind: t.agentKind ?? "", p_cost_source: t.costSource, p_active: t.active, p_sort_order: t.sortOrder,
  p_own_cost_flat_eur: t.ownCostFlatEur, p_own_cost_percent: t.ownCostPercent, p_margin_flat_eur: t.marginFlatEur, p_margin_percent: t.marginPercent, p_premium_eur: t.premiumEur,
  p_min_fee_eur: t.minFeeEur, p_max_fee_eur: t.maxFeeEur, p_delivery_time: t.deliveryTime ?? "", p_onboarding_requirements: t.onboardingRequirements, p_notes: t.notes, p_reason: reason,
});
export const listChannelTypeCountries = (code: string) => rows<ChannelTypeCountryRow>("channel_type_country_list", { p_code: code }).then((r) => r.map((o) => ({
  ...o, ownCostFlatEur: numOrNull(o.ownCostFlatEur), ownCostPercent: numOrNull(o.ownCostPercent), marginFlatEur: numOrNull(o.marginFlatEur), marginPercent: numOrNull(o.marginPercent),
  premiumEur: numOrNull(o.premiumEur), minFeeEur: numOrNull(o.minFeeEur), maxFeeEur: numOrNull(o.maxFeeEur),
})));
export const setChannelTypeCountry = (o: ChannelTypeCountryRow, reason: string) => call("channel_type_country_set", {
  p_code: o.code, p_country: o.country, p_active: o.active, p_own_cost_flat_eur: o.ownCostFlatEur, p_own_cost_percent: o.ownCostPercent, p_margin_flat_eur: o.marginFlatEur,
  p_margin_percent: o.marginPercent, p_premium_eur: o.premiumEur, p_min_fee_eur: o.minFeeEur, p_max_fee_eur: o.maxFeeEur, p_delivery_time: o.deliveryTime ?? "", p_reason: reason,
});
export const clearChannelTypeCountry = (code: string, country: string, reason: string) => call("channel_type_country_clear", { p_code: code, p_country: country, p_reason: reason });
export const channelTypeReadiness = (code: string) => rows<ReadinessRow>("channel_type_readiness", { p_code: code });
export const simulateChannelType = (country: string, code: string, amountUsd: number) =>
  rows<ChannelTypeSim>("channel_type_simulate", { p_country: country, p_code: code, p_amount_usd: amountUsd }).then((r) => r.map((x) => nums(x, ["feeEur", "costEur"])));

export interface OfferDraft { draft: Record<string, unknown>; ambiguities: string[] }

// Claude drafts the structured offer from pasted text (server side, with the caller's own session); an admin reviews it before importing.
export async function draftOfferWithAi(text: string): Promise<OfferDraft | { error: string }> {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  if (!site) return { error: "not_configured" };
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) return { error: "unauthorized" };
  try {
    const res = await fetch(`${site}/aiPartnerOffer`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text }) });
    const body = (await res.json().catch(() => ({}))) as { draft?: Record<string, unknown>; ambiguities?: string[]; error?: string; message?: string };
    if (body.draft) return { draft: body.draft, ambiguities: body.ambiguities ?? [] };
    return { error: body.error ?? (res.ok ? "ai_unavailable" : "forbidden") };
  } catch {
    return { error: "ai_unavailable" };
  }
}
