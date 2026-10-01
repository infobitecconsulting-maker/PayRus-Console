// Console oversight of customer webhooks (supabase/migrations/0058): delivery health and failures.
import { supabase } from "./supabase-client.ts";

export interface WebhookOverview { webhooks: number; active: number; queued: number; delivered24h: number; failed24h: number; dead: number; oldestQueuedMinutes: number | null }
export interface WebhookFailure { id: string; ownerName: string; url: string; event: string; status: string; attempts: number; responseCode: number | null; lastError: string | null; createdAt: string }

const n = (v: unknown) => Number(v ?? 0);

export async function getWebhookOverview(): Promise<WebhookOverview> {
  const res = await supabase.rpc("admin_webhook_overview");
  if (res.error) throw new Error(res.error.message);
  const r = ((res.data ?? [])[0] ?? {}) as Record<string, unknown>;
  return {
    webhooks: n(r.webhooks), active: n(r.active), queued: n(r.queued), delivered24h: n(r.delivered_24h), failed24h: n(r.failed_24h), dead: n(r.dead),
    oldestQueuedMinutes: r.oldest_queued_minutes === null || r.oldest_queued_minutes === undefined ? null : n(r.oldest_queued_minutes),
  };
}

export async function listWebhookFailures(): Promise<WebhookFailure[]> {
  const res = await supabase.rpc("admin_webhook_failures", { p_limit: 25 });
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, ownerName: (r.owner_name as string) ?? "", url: r.url as string, event: r.event as string, status: r.status as string, attempts: n(r.attempts),
    responseCode: r.response_code === null ? null : n(r.response_code), lastError: (r.last_error as string) ?? null, createdAt: r.created_at as string,
  }));
}
