// Console oversight of account plans and workspace teams (supabase/migrations/0059).
import { supabase } from "./supabase-client.ts";

export interface PlanCount { plan: string; family: string; label: string; accounts: number }
export interface TeamOverview { workspaces: number; members: number; suspended: number; customRoles: number; roles: { label: string; members: number }[] }

const n = (v: unknown) => Number(v ?? 0);

export async function getPlanDistribution(): Promise<PlanCount[]> {
  const res = await supabase.rpc("admin_plan_distribution");
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => ({ plan: r.plan as string, family: r.family as string, label: r.label as string, accounts: n(r.accounts) }));
}

export async function getTeamOverview(): Promise<TeamOverview> {
  const res = await supabase.rpc("admin_team_overview");
  if (res.error) throw new Error(res.error.message);
  const rows = (res.data ?? []) as Record<string, unknown>[];
  const f = rows[0] ?? {};
  return { workspaces: n(f.workspaces), members: n(f.members), suspended: n(f.suspended), customRoles: n(f.custom_roles), roles: rows.map((r) => ({ label: r.role_label as string, members: n(r.role_members) })) };
}
