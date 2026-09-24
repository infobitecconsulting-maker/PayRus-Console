// Native P2P sending, same RPCs and rules as App/src/pages/p2p (0023 p2p_transfer,
// 0031 search_my_counterparts). The database checks the acting user against the
// session, debits the sender, credits the recipient and records the contact.
import { supabase } from "./supabase-client.ts";

/** Flat commission paid by the sender — mirrors App/convex/fx.ts COMMISSION_RATE. */
export const COMMISSION_RATE = 0.035;

export interface Counterpart {
  id: string; name: string; username: string | null; defaultCurrency: string | null; maskedEmail: string | null;
  timesSent: number; lastSentAt: string; lastCurrency: string | null;
}
export interface Recipient { id: string; name: string; username: string | null; defaultCurrency: string | null }
export interface P2pReceipt { reference: string; senderName: string; recipientName: string; amount: number; currency: string }

export async function searchMyCounterparts(query: string, limit = 8): Promise<Counterpart[]> {
  const res = await supabase.rpc("search_my_counterparts", { p_query: query || null, p_limit: limit });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, name: (r.name as string) ?? (r.username as string) ?? "PayRus member", username: (r.username as string) ?? null,
    defaultCurrency: (r.default_currency as string) ?? null, maskedEmail: (r.masked_email as string) ?? null,
    timesSent: Number(r.times_sent), lastSentAt: r.last_sent_at as string, lastCurrency: (r.last_currency as string) ?? null,
  }));
}

// Exact match by email, @username or phone — not a browsable directory.
export async function resolveRecipient(identifier: string): Promise<Recipient | null> {
  const res = await supabase.rpc("resolve_user_by_identifier", { p_identifier: identifier });
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? []) as Record<string, unknown>[])[0];
  return r ? { id: r.id as string, name: (r.name as string) ?? (r.username as string) ?? "PayRus member", username: (r.username as string) ?? null, defaultCurrency: (r.default_currency as string) ?? null } : null;
}

export async function sendP2p(a: { senderId: string; recipientId: string; amount: number; currency: string; note?: string }): Promise<P2pReceipt> {
  const res = await supabase.rpc("p2p_transfer", { p_sender_id: a.senderId, p_recipient_id: a.recipientId, p_amount: a.amount, p_currency: a.currency, p_note: a.note ?? null });
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? []) as Record<string, unknown>[])[0];
  return { reference: r.reference as string, senderName: (r.sender_name as string) ?? "", recipientName: (r.recipient_name as string) ?? "", amount: Number(r.amount), currency: r.currency as string };
}

export interface SendContext { wallets: { currency: string; balance: number }[]; defaultCurrency: string | null }

// The sender's own wallets and effective transaction currency (live-location
// currency first, else registration currency — migration 0028).
export async function loadSendContext(userId: string): Promise<SendContext> {
  const [w, u] = await Promise.all([
    supabase.from("wallet_views").select("currency, balance_snapshot").eq("user_id", userId),
    supabase.from("users").select("default_currency, location_currency").eq("id", userId).maybeSingle(),
  ]);
  return {
    wallets: (w.data ?? []).map((r) => ({ currency: r.currency as string, balance: Number(r.balance_snapshot) })),
    defaultCurrency: ((u.data?.location_currency as string | null) ?? (u.data?.default_currency as string | null)) ?? null,
  };
}
