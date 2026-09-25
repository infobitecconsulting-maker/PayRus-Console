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

// ---- Send to a NEW receiver from identification data (migration 0038) ----
export type PayoutMethod = "mobile_money" | "bank" | "cash_pickup";
export interface Receiver {
  id: string; fullName: string; country: string | null; currency: string | null; deliveryMethod: PayoutMethod; provider: string | null;
  account: string; phone: string | null; idType: string | null; idNumber: string | null; city: string | null;
}
export interface PayoutRow {
  id: string; reference: string | null; receiverName: string; deliveryMethod: PayoutMethod; accountMasked: string; receiveAmount: number; toCurrency: string;
  status: "processing" | "ready_for_pickup" | "paid_out" | "blocked" | "cancelled"; pickupCode: string | null; createdAt: string;
}
export interface ReceiverInput {
  fullName: string; country: string; currency: string; deliveryMethod: PayoutMethod; provider?: string; account?: string; phone?: string;
  idType?: string; idNumber?: string; city?: string;
}
export interface PayoutReceipt { reference: string; payoutStatus: PayoutRow["status"]; pickupCode: string | null; receiveAmount: number; toCurrency: string; receiverName: string; deliveryMethod: PayoutMethod }
export interface CorridorQuote { ok: boolean; blockedReason: string | null; fee: number; receiveAmount: number }

const str = (v: unknown) => (v == null ? null : String(v));

export async function listMyReceivers(): Promise<Receiver[]> {
  const res = await supabase.rpc("list_my_receivers");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, fullName: r.full_name as string, country: str(r.country), currency: str(r.currency), deliveryMethod: r.delivery_method as PayoutMethod,
    provider: str(r.provider), account: r.account as string, phone: str(r.phone), idType: str(r.id_type), idNumber: str(r.id_number), city: str(r.city),
  }));
}

export async function listMyPayouts(): Promise<PayoutRow[]> {
  const res = await supabase.rpc("list_my_payouts", { p_limit: 20 });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, reference: str(r.reference), receiverName: r.receiver_name as string, deliveryMethod: r.delivery_method as PayoutMethod,
    accountMasked: r.account_masked as string, receiveAmount: Number(r.receive_amount), toCurrency: r.to_currency as string,
    status: r.status as PayoutRow["status"], pickupCode: str(r.pickup_code), createdAt: r.created_at as string,
  }));
}

export async function getCorridorQuote(from: string, to: string, amount: number): Promise<CorridorQuote> {
  const res = await supabase.rpc("remittance_quote", { p_from: from, p_to: to, p_amount: amount });
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? []) as Record<string, unknown>[])[0];
  return { ok: Boolean(r?.ok), blockedReason: str(r?.blocked_reason), fee: Number(r?.fee ?? 0), receiveAmount: Number(r?.receive_amount ?? 0) };
}

// Saves the receiver (validated per payout method in the database) and sends.
export async function sendToNewReceiver(a: ReceiverInput & { senderId: string; amount: number; from: string; note?: string }): Promise<PayoutReceipt> {
  const saved = await supabase.rpc("save_receiver", {
    p_full_name: a.fullName, p_country: a.country, p_currency: a.currency, p_delivery_method: a.deliveryMethod, p_provider: a.provider ?? null,
    p_account: a.account ?? null, p_phone: a.phone ?? null, p_id_type: a.idType ?? null, p_id_number: a.idNumber ?? null, p_city: a.city ?? null,
  });
  if (saved.error) throw new Error(saved.error.message);
  const res = await supabase.rpc("send_to_receiver", { p_sender_id: a.senderId, p_receiver_id: saved.data, p_amount: a.amount, p_from: a.from, p_note: a.note ?? null });
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? []) as Record<string, unknown>[])[0];
  return { reference: r.reference as string, payoutStatus: r.payout_status as PayoutRow["status"], pickupCode: str(r.pickup_code), receiveAmount: Number(r.receive_amount), toCurrency: r.to_currency as string, receiverName: r.receiver_name as string, deliveryMethod: r.delivery_method as PayoutMethod };
}

export interface PickupResult { ok: boolean; reason: string | null; receiverName: string | null; amount: number | null; currency: string | null }

export async function confirmPickup(code: string, idNumber: string): Promise<PickupResult> {
  const res = await supabase.rpc("payout_confirm_pickup", { p_code: code, p_id_number: idNumber });
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? []) as Record<string, unknown>[])[0];
  return { ok: Boolean(r?.ok), reason: str(r?.reason), receiverName: str(r?.receiver_name), amount: r?.amount == null ? null : Number(r.amount), currency: str(r?.currency) };
}
