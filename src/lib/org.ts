// Organisation tree, scoped roles, residency and cases (supabase/migrations/0029 + 0030) — same RPCs as App/src/lib/org-backend.ts.
// Every call goes through security-definer RPCs that enforce the caller's scope
// in Postgres; nothing here decides permissions.
import { supabase } from "./supabase-client.ts";

const camelKey = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const camel = <T>(r: Record<string, unknown>): T => Object.fromEntries(Object.entries(r).map(([k, v]) => [camelKey(k), v])) as T;

async function rows<T>(name: string, args?: Record<string, unknown>): Promise<T[]> {
  const res = await supabase.rpc(name, args);
  if (res.error) throw new Error(res.error.message);
  return ((res.data ?? []) as Record<string, unknown>[]).map((r) => camel<T>(r));
}

async function one<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T> {
  const res = await supabase.rpc(name, args);
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export interface Org { id: string; parentId: string | null; kind: string; name: string; country: string | null; depth: number; operatingLevel: string; status: string; memberCount: number; path: string }
export interface OrgMembership { memberId: string; orgId: string; orgName: string; orgKind: string; orgCountry: string | null; templateSlug: string; templateLabel: string; status: string }
export interface OrgMember { memberId: string; userId: string; userName: string | null; userEmail: string | null; templateSlug: string; templateLabel: string; status: string; createdAt: string }
export interface OrgCapability { resource: string; canCreate: boolean; canRead: boolean; canUpdate: boolean }
export interface OrgCustomer { id: string; maskedName: string; maskedEmail: string | null; homeCountry: string | null; kycStatus: string; organisationId: string; sensitiveVisible: boolean }
export interface OrgTransfer { transferId: string; reference: string; type: string; state: string; amount: number; currency: string; createdAt: string; originCountry: string | null; customerId: string; customerMaskedName: string; homeCountry: string | null; originOrgName: string | null }
export interface OrgCustomerDetail { id: string; masked: boolean; name: string; email: string | null; phone: string | null; homeCountry: string | null; defaultCurrency: string | null; kycStatus: string; dateOfBirth: string | null; address: string | null; idType: string | null }
export interface BreakGlassRow { id: string; requesterName: string; targetMaskedName: string; homeCountry: string | null; reason: string; createdAt: string; expiresAt: string; active: boolean }
export interface OrgTemplate { slug: string; label: string; description: string; appliesTo: string[]; groupOnly: boolean }
export interface OrgTemplatePerm { templateSlug: string; resource: string; canCreate: boolean; canRead: boolean; canUpdate: boolean }
export interface OrgLevel { slug: string; label: string; description: string; maxDepth: number; canCreateSuborgs: boolean; canManageProfiles: boolean }

export const CASE_STATUSES = ["open", "in_progress", "awaiting_approval", "escalated", "resolved", "closed"] as const;
export interface OrgCaseRow { id: string; reference: string; kind: string; priority: string; status: string; subject: string; escalationLevel: number; slaDueAt: string; slaBreached: boolean; orgName: string; raisedOrgName: string; customerMaskedName: string | null; assigneeId: string | null; createdAt: string; updatedAt: string }
export interface OrgCaseDetail {
  id: string; reference: string; kind: string; priority: string; status: string; subject: string; description: string | null; escalationLevel: number;
  slaDueAt: string; slaBreached: boolean; orgName: string; raisedOrgName: string; orgId: string;
  customer: { id: string; masked_name: string; home_country: string | null; kyc_status: string } | null;
  transaction: { id: string; reference: string; type: string; state: string; amount: number; currency: string; origin_country: string | null } | null;
  events: { event: string; body: string | null; at: string; actor: string | null }[];
  approvals: { id: string; action: string; status: string; request_reason: string; decision_reason: string | null; created_at: string; requested_by_me: boolean }[];
}
export interface OrgAiPayload {
  source: "ai" | "rules"; priority: string | null; route: string | null; category?: string; suggested_action: string | null; needs_second_approver: boolean;
  risk_flags: string[]; summary: string; rationale?: string; next_step: string; draft_reply: string | null; confidence?: number;
}
export interface OrgAiSuggestion { id: string; source: "ai" | "rules"; model: string | null; payload: OrgAiPayload; status: "new" | "accepted" | "dismissed"; createdAt: string }

export const listOrgs = () => rows<Org>("org_list").then((r) => r.map((o) => ({ ...o, memberCount: Number(o.memberCount) })));
export const myMemberships = () => rows<OrgMembership>("org_my_memberships");
export const orgCapabilities = (orgId: string) => rows<OrgCapability>("org_my_capabilities", { p_org_id: orgId });
export const orgMembers = (orgId: string) => rows<OrgMember>("org_list_members", { p_org_id: orgId });
export const orgCustomers = (orgId: string) => rows<OrgCustomer>("org_list_customers", { p_org_id: orgId });
export const orgTransfers = (orgId: string) => rows<OrgTransfer>("org_list_transfers", { p_org_id: orgId }).then((r) => r.map((t) => ({ ...t, amount: Number(t.amount) })));
export const orgCustomerDetail = (userId: string) => one<Record<string, unknown>>("org_get_customer", { p_user_id: userId }).then((r) => camel<OrgCustomerDetail>(r));
export const breakGlassLog = () => rows<BreakGlassRow>("org_list_break_glass");
export const requestBreakGlass = (userId: string, reason: string) => one("org_request_break_glass", { p_target_user_id: userId, p_reason: reason });

export async function orgTemplates(): Promise<{ templates: OrgTemplate[]; perms: OrgTemplatePerm[]; levels: OrgLevel[] }> {
  const [t, p, l] = await Promise.all([
    supabase.from("org_role_templates").select("*").order("sort_order"),
    supabase.from("org_role_template_permissions").select("*"),
    supabase.from("org_operating_levels").select("*").order("sort_order"),
  ]);
  for (const r of [t, p, l]) if (r.error) throw new Error(r.error.message);
  return {
    templates: (t.data ?? []).map((r) => camel<OrgTemplate>(r)),
    perms: (p.data ?? []).map((r) => camel<OrgTemplatePerm>(r)),
    levels: (l.data ?? []).map((r) => camel<OrgLevel>(r)),
  };
}

export const createOrg = (a: { parentId: string; kind: string; name: string; country?: string; level?: string }) =>
  one("org_create", { p_parent_id: a.parentId, p_kind: a.kind, p_name: a.name, p_country: a.country ?? null, p_operating_level: a.level ?? null });
export const setOrgStatus = (orgId: string, status: "active" | "suspended") => one("org_set_status", { p_org_id: orgId, p_status: status });
export const setOrgLevel = (orgId: string, level: string) => one("org_set_operating_level", { p_org_id: orgId, p_level: level });
export const setMemberStatus = (memberId: string, status: "active" | "suspended") => one("org_set_member_status", { p_member_id: memberId, p_status: status });
export const setTemplatePermission = (a: { slug: string; resource: string; create: boolean; read: boolean; update: boolean }) =>
  one("org_set_template_permission", { p_template_slug: a.slug, p_resource: a.resource, p_create: a.create, p_read: a.read, p_update: a.update });
export const setLevelRules = (a: { level: string; maxDepth: number; canCreateSuborgs: boolean; canManageProfiles: boolean }) =>
  one("org_set_level_rules", { p_level: a.level, p_max_depth: a.maxDepth, p_can_create_suborgs: a.canCreateSuborgs, p_can_manage_profiles: a.canManageProfiles });

export async function grantMemberByEmail(a: { email: string; orgId: string; templateSlug: string }): Promise<void> {
  const found = await rows<{ id: string }>("resolve_user_by_identifier", { p_identifier: a.email.trim() });
  if (!found[0]) throw new Error("No PayRus account with that email — ask them to register first.");
  await one("org_grant_member", { p_user_id: found[0].id, p_org_id: a.orgId, p_template_slug: a.templateSlug });
}

export const listCases = (orgId: string, status?: string) =>
  rows<OrgCaseRow>("org_list_cases", { p_org_id: orgId, p_status: status ?? null });
export const getCase = (caseId: string) => one<Record<string, unknown>>("org_case_get", { p_case_id: caseId }).then((r) => camel<OrgCaseDetail>(r));
export const createCase = (a: { orgId: string; kind: string; subject: string; description?: string; priority: string; customerId?: string; transferId?: string }) =>
  one("org_case_create", { p_org_id: a.orgId, p_kind: a.kind, p_subject: a.subject, p_description: a.description ?? null, p_priority: a.priority, p_customer_id: a.customerId ?? null, p_transfer_id: a.transferId ?? null });
export const commentCase = (caseId: string, body: string) => one("org_case_comment", { p_case_id: caseId, p_body: body });
export const escalateCase = (caseId: string, reason: string) => one("org_case_escalate", { p_case_id: caseId, p_reason: reason });
export const closeCase = (caseId: string, outcome: "resolved" | "closed", reason: string) => one("org_case_close", { p_case_id: caseId, p_outcome: outcome, p_reason: reason });
export const requestCaseAction = (caseId: string, action: string, reason: string) => one("org_case_request_action", { p_case_id: caseId, p_action: action, p_reason: reason });
export const decideCaseAction = (approvalId: string, approve: boolean, reason: string) => one("org_case_decide", { p_approval_id: approvalId, p_approve: approve, p_reason: reason });
export const markCaseAi = (id: string, status: "accepted" | "dismissed") => one("org_case_mark_ai", { p_suggestion_id: id, p_status: status });
export const listCaseAi = (caseId: string) => rows<OrgAiSuggestion>("org_case_list_ai", { p_case_id: caseId });

// Claude first (server-side via Convex, with the caller's own session); the
// deterministic in-database triage answers whenever it is unavailable.
export async function runCaseTriage(caseId: string): Promise<{ via: "ai" | "rules"; fallbackReason?: string }> {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  let fallbackReason = "AI is not configured";
  if (site) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        const res = await fetch(`${site}/aiOrgCaseAssist`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ caseId }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
        if (res.ok) return { via: "ai" };
        if (res.status === 401 || res.status === 403) throw new Error(body.message ?? "Not permitted");
        fallbackReason = body.error === "not_configured" ? "AI is not configured" : "AI is unavailable";
      }
    } catch (e) {
      if (e instanceof Error && /permitted|permission|forbidden/i.test(e.message)) throw e;
      fallbackReason = "AI is unreachable";
    }
  }
  await one("org_case_rules_triage", { p_case_id: caseId });
  return { via: "rules", fallbackReason };
}
