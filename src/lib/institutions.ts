// Console oversight of the institutional modules (supabase/migrations/0054):
// book of business per record kind, four-eyes backlog, items stuck after
// approval, and sub-profile adoption. Both RPCs are staff-only in the database.
import { supabase } from "./supabase-client.ts";

export interface InstOverviewRow {
  moduleKey: string; kind: string; kindLabel: string; owners: number; records: number; totalAmount: number;
  openAmount: number; awaitingApproval: number; stuckOver7d: number; settledAmount: number;
}
export interface SubProfileStat { subProfile: string; label: string; holders: number }

const n = (v: unknown) => Number(v ?? 0);

export async function listInstOverview(): Promise<InstOverviewRow[]> {
  const res = await supabase.rpc("admin_inst_overview");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({
    moduleKey: r.module_key as string, kind: r.kind as string, kindLabel: r.kind_label as string, owners: n(r.owners), records: n(r.records),
    totalAmount: n(r.total_amount), openAmount: n(r.open_amount), awaitingApproval: n(r.awaiting_approval), stuckOver7d: n(r.stuck_over_7d), settledAmount: n(r.settled_amount),
  }));
}

export async function listSubProfileStats(): Promise<SubProfileStat[]> {
  const res = await supabase.rpc("admin_inst_sub_profile_stats");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({ subProfile: r.sub_profile as string, label: r.label as string, holders: n(r.holders) }));
}
