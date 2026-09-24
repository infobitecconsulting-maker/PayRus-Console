// Own-account data for the Settings screen and the FX pill. Everything is the
// signed-in user's own rows (owner-scoped RLS) or a self-service RPC that
// resolves the user from the session (update_my_profile, 0025).
import { supabase } from "./supabase-client.ts";
import { getLastFxRateUpdate } from "./adminConfig.ts";

export const FX_CURRENCY_KEY = "payrus_fx_currency";

export function getPreferredFxCurrency(): string | null {
  try { return localStorage.getItem(FX_CURRENCY_KEY); } catch { return null; }
}

export function setPreferredFxCurrency(code: string | null): void {
  try {
    if (code) localStorage.setItem(FX_CURRENCY_KEY, code); else localStorage.removeItem(FX_CURRENCY_KEY);
    window.dispatchEvent(new Event("payrus-fx-currency"));
  } catch { /* ignore */ }
}

export interface FxPair { code: string; rate: number }
export interface FxSnapshot { local: string; pairs: FxPair[]; updatedAt: string | null }

async function ratePerUsd(codes: string[]): Promise<Record<string, number>> {
  const res = await supabase.from("currencies").select("code, rate_per_usd").in("code", codes);
  if (res.error) throw new Error(`ratePerUsd: ${res.error.message}`);
  const out: Record<string, number> = { USD: 1 };
  for (const r of res.data ?? []) if (r.rate_per_usd != null) out[r.code as string] = Number(r.rate_per_usd);
  return out;
}

// The user's own currency (Settings choice, else registration country, else
// the browser language's country) against USD and EUR, from the platform's
// live table (currencies.rate_per_usd, refreshed by the scheduled job).
export async function loadFxSnapshot(userId: string | null): Promise<FxSnapshot> {
  let local = getPreferredFxCurrency();
  if (!local && userId) {
    const u = await supabase.from("users").select("default_currency").eq("id", userId).maybeSingle();
    local = (u.data?.default_currency as string | null) ?? null;
  }
  if (!local) {
    const region = navigator.language.split("-")[1]?.toUpperCase();
    if (region) {
      const c = await supabase.from("countries").select("currency").eq("code", region).maybeSingle();
      local = (c.data?.currency as string | null) ?? null;
    }
  }
  local = local ?? "USD";
  const rates = await ratePerUsd(Array.from(new Set([local, "USD", "EUR"])));
  const pairs: FxPair[] = [];
  if (rates[local]) {
    for (const base of ["USD", "EUR"]) {
      if (base !== local && rates[base]) pairs.push({ code: base, rate: rates[local] / rates[base] });
    }
  }
  const upd = await getLastFxRateUpdate().catch(() => null);
  return { local, pairs, updatedAt: upd?.fetchedAt ?? null };
}

export async function listCurrencyCodes(): Promise<string[]> {
  const res = await supabase.from("currencies").select("code").not("rate_per_usd", "is", null).order("code");
  return (res.data ?? []).map((r) => r.code as string);
}

export interface MyProfile {
  id: string; name: string | null; email: string | null; username: string | null; phone: string | null;
  country: string | null; defaultCurrency: string | null; kycStatus: string; roles: { role: string; status: string }[];
}

export async function loadMyProfile(userId: string): Promise<MyProfile> {
  const [u, r] = await Promise.all([
    supabase.from("users").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role, status").eq("user_id", userId),
  ]);
  if (u.error || !u.data) throw new Error(u.error?.message ?? "profile not found");
  const row = u.data as Record<string, unknown>;
  return {
    id: row.id as string, name: (row.name as string) ?? null, email: (row.email as string) ?? null, username: (row.username as string) ?? null,
    phone: (row.phone as string) ?? null, country: (row.country as string) ?? null, defaultCurrency: (row.default_currency as string) ?? null,
    kycStatus: row.kyc_status as string, roles: (r.data ?? []).map((x) => ({ role: x.role as string, status: x.status as string })),
  };
}

export async function updateMyProfile(name: string, phone: string): Promise<void> {
  const res = await supabase.rpc("update_my_profile", { p_name: name, p_phone: phone });
  if (res.error) throw new Error(res.error.message);
}

export async function changePassword(newPassword: string): Promise<void> {
  const res = await supabase.auth.updateUser({ password: newPassword });
  if (res.error) throw new Error(res.error.message);
}

export async function signOutOtherDevices(): Promise<void> {
  const res = await supabase.auth.signOut({ scope: "others" });
  if (res.error) throw new Error(res.error.message);
}

export interface MyNotification { id: string; kind: string; title: string; body: string; read: boolean; createdAt: string }

export async function listMyNotifications(userId: string): Promise<MyNotification[]> {
  const res = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []).map((n) => ({ id: n.id as string, kind: n.kind as string, title: n.title as string, body: n.body as string, read: Boolean(n.read), createdAt: n.created_at as string }));
}

export async function markNotificationRead(id: string): Promise<void> {
  const res = await supabase.rpc("mark_notification_read", { p_notification_id: id });
  if (res.error) throw new Error(res.error.message);
}

export interface MyWallet { id: string; currency: string; provider: string | null; balance: number }
export interface MyCard { id: string; brand: string; last4: string; type: string; locked: boolean }

export async function listMyWalletsAndCards(userId: string): Promise<{ wallets: MyWallet[]; cards: MyCard[] }> {
  const [w, c] = await Promise.all([
    supabase.from("wallet_views").select("*").eq("user_id", userId),
    supabase.from("cards").select("*").eq("user_id", userId),
  ]);
  return {
    wallets: (w.data ?? []).map((r) => ({ id: r.id as string, currency: r.currency as string, provider: (r.provider as string) ?? null, balance: Number(r.balance_snapshot) })),
    cards: (c.data ?? []).map((r) => ({ id: r.id as string, brand: r.brand as string, last4: r.last4 as string, type: r.type as string, locked: Boolean(r.locked) })),
  };
}

export async function exportMyData(userId: string): Promise<string> {
  const [profile, wallets, notifications, transfers] = await Promise.all([
    loadMyProfile(userId),
    listMyWalletsAndCards(userId),
    listMyNotifications(userId),
    supabase.from("transfers").select("reference, type, state, amount, currency, note, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);
  return JSON.stringify({ exportedAt: new Date().toISOString(), profile, ...wallets, notifications, transfers: transfers.data ?? [] }, null, 2);
}
