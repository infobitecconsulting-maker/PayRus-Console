// Administration RPCs (users, transactions, escalations, staff + CRUD matrix) —
// the same functions App/'s Admin panel calls, defined in
// supabase/migrations/0024_admin_directory_and_support_roles.sql. Every one
// is authorised in the database against the signed-in account's role
// (superadmin / admin / support_agent + the support_permissions matrix); the
// UI only hides buttons the account cannot use.
import { supabase } from "./supabase-client.ts";

function rows<T>(res: { data: T[] | null; error: { message: string } | null }, label: string): T[] {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data ?? [];
}

function done(res: { error: { message: string } | null }, label: string): void {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
}

const clean = (message: string) => message.replace(/^[A-Za-z_]+: /, "");
export const errorText = (e: unknown, fallback: string) => (e instanceof Error ? clean(e.message) : fallback);

export interface Perms { create: boolean; read: boolean; update: boolean; delete: boolean }
export interface MyPermissions { isSuperadmin: boolean; isAdmin: boolean; users: Perms; transactions: Perms }

export async function getMyPermissions(): Promise<MyPermissions> {
  const list = rows(await supabase.rpc("my_permissions"), "getMyPermissions") as Record<string, unknown>[];
  const pick = (resource: string): Perms => {
    const r = list.find((x) => x.resource === resource);
    return { create: Boolean(r?.can_create), read: Boolean(r?.can_read), update: Boolean(r?.can_update), delete: Boolean(r?.can_delete) };
  };
  return { isSuperadmin: list.some((r) => Boolean(r.is_superadmin)), isAdmin: list.some((r) => Boolean(r.is_admin)), users: pick("users"), transactions: pick("transactions") };
}

export interface StaffUser {
  id: string; name: string | null; email: string | null; username: string | null; phone: string | null;
  country: string | null; defaultCurrency: string | null; kycStatus: "unverified" | "submitted" | "verified";
  roles: { id: string; role: string; status: string }[]; walletCount: number;
  wallets: { currency: string; balance: number; provider: string | null }[];
}

export async function listUsers(): Promise<StaffUser[]> {
  const list = rows(await supabase.rpc("admin_list_users"), "listUsers") as Record<string, unknown>[];
  return list.map((r) => {
    const u = r.user_data as Record<string, unknown>;
    return {
      id: u.id as string, name: (u.name as string) ?? null, email: (u.email as string) ?? null, username: (u.username as string) ?? null,
      phone: (u.phone as string) ?? null, country: (u.country as string) ?? null, defaultCurrency: (u.default_currency as string) ?? null,
      kycStatus: u.kyc_status as StaffUser["kycStatus"],
      roles: (r.roles as Record<string, unknown>[]).map((x) => ({ id: x.id as string, role: x.role as string, status: x.status as string })),
      walletCount: (r.wallets as unknown[]).length,
      wallets: (r.wallets as Record<string, unknown>[]).map((w) => ({ currency: w.currency as string, balance: Number(w.balance_snapshot), provider: (w.provider as string) ?? null })),
    };
  });
}

export async function updateUser(args: {
  userId: string; name?: string; phone?: string; country?: string; defaultCurrency?: string; kycStatus?: StaffUser["kycStatus"];
}): Promise<void> {
  done(await supabase.rpc("admin_update_user", {
    p_user_id: args.userId, p_name: args.name ?? null, p_phone: args.phone ?? null, p_country: args.country ?? null,
    p_default_currency: args.defaultCurrency ?? null, p_kyc_status: args.kycStatus ?? null,
  }), "updateUser");
}

export interface StaffTransfer {
  id: string; reference: string; type: string; state: string; amount: number; currency: string; note: string | null;
  userId: string; userName: string | null; userEmail: string | null; createdAt: string;
}

export async function listTransfers(userId?: string): Promise<StaffTransfer[]> {
  const list = rows(await supabase.rpc("admin_list_transfers", { p_limit: 300, p_user_id: userId ?? null }), "listTransfers") as Record<string, unknown>[];
  return list.map((r) => ({
    id: r.transfer_id as string, reference: r.reference as string, type: r.type as string, state: r.state as string,
    amount: Number(r.amount), currency: r.currency as string, note: (r.note as string) ?? null, userId: r.user_id as string,
    userName: (r.user_name as string) ?? null, userEmail: (r.user_email as string) ?? null, createdAt: r.created_at as string,
  }));
}

export async function completeTransfer(transferId: string, note?: string): Promise<void> {
  done(await supabase.rpc("support_complete_transfer", { p_transfer_id: transferId, p_note: note ?? null }), "completeTransfer");
}

export async function resolveTransfer(transferId: string, newState: "resolved" | "refunded", note?: string): Promise<void> {
  done(await supabase.rpc("support_resolve_transfer", { p_transfer_id: transferId, p_new_state: newState, p_note: note ?? null }), "resolveTransfer");
}

export async function voidTransfer(transferId: string, note: string, password: string): Promise<void> {
  done(await supabase.rpc("support_void_transfer", { p_transfer_id: transferId, p_note: note, p_password: password }), "voidTransfer");
}

export async function createAdjustment(userId: string, amount: number, currency: string, reason: string): Promise<void> {
  done(await supabase.rpc("support_create_adjustment", { p_user_id: userId, p_amount: amount, p_currency: currency, p_reason: reason }), "createAdjustment");
}

export type EscalationAction = "complete" | "refund" | "close_dispute" | "void" | "adjustment" | "profile_edit" | "other";

export interface StaffEscalation {
  id: string; action: EscalationAction; details: string; status: "open" | "done" | "approved" | "rejected";
  resolutionNote: string | null; amount: number | null; currency: string | null; transferReference: string | null;
  targetName: string | null; targetEmail: string | null; requesterName: string | null; createdAt: string;
}

export async function listEscalations(): Promise<StaffEscalation[]> {
  const list = rows(await supabase.rpc("admin_list_escalations"), "listEscalations") as Record<string, unknown>[];
  return list.map((r) => ({
    id: r.id as string, action: r.action as EscalationAction, details: r.details as string, status: r.status as StaffEscalation["status"],
    resolutionNote: (r.resolution_note as string) ?? null, amount: r.amount == null ? null : Number(r.amount), currency: (r.currency as string) ?? null,
    transferReference: (r.transfer_reference as string) ?? null, targetName: (r.target_name as string) ?? null,
    targetEmail: (r.target_email as string) ?? null, requesterName: (r.requester_name as string) ?? null, createdAt: r.created_at as string,
  }));
}

export async function requestEscalation(args: {
  targetUserId: string; action: EscalationAction; details: string; transferId?: string; amount?: number; currency?: string;
}): Promise<void> {
  done(await supabase.rpc("support_request_escalation", {
    p_target_user_id: args.targetUserId, p_action: args.action, p_details: args.details,
    p_transfer_id: args.transferId ?? null, p_amount: args.amount ?? null, p_currency: args.currency ?? null,
  }), "requestEscalation");
}

export async function resolveEscalation(escalationId: string, decision: "approve" | "reject" | "done", note?: string, password?: string): Promise<void> {
  done(await supabase.rpc("admin_resolve_escalation", {
    p_escalation_id: escalationId, p_decision: decision, p_note: note ?? null, p_password: password ?? null,
  }), "resolveEscalation");
}

export interface StaffRole { slug: string; label: string; description: string }
export interface MatrixRow { roleSlug: string; resource: "users" | "transactions"; create: boolean; read: boolean; update: boolean; delete: boolean }

export async function listStaffRoles(): Promise<StaffRole[]> {
  const list = rows(await supabase.from("support_roles").select("*").order("sort_order"), "listStaffRoles") as Record<string, unknown>[];
  return list.map((r) => ({ slug: r.slug as string, label: r.label as string, description: r.description as string }));
}

export async function listMatrix(): Promise<MatrixRow[]> {
  const list = rows(await supabase.from("support_permissions").select("*"), "listMatrix") as Record<string, unknown>[];
  return list.map((r) => ({
    roleSlug: r.role_slug as string, resource: r.resource as MatrixRow["resource"],
    create: Boolean(r.can_create), read: Boolean(r.can_read), update: Boolean(r.can_update), delete: Boolean(r.can_delete),
  }));
}

export async function setPermission(row: MatrixRow, password: string): Promise<void> {
  done(await supabase.rpc("admin_set_support_permission", {
    p_role_slug: row.roleSlug, p_resource: row.resource, p_create: row.create, p_read: row.read,
    p_update: row.update, p_delete: row.delete, p_password: password,
  }), "setPermission");
}

export async function assignStaffRole(userId: string, roleSlug: string, password: string): Promise<void> {
  done(await supabase.rpc("admin_assign_staff_role", { p_user_id: userId, p_role_slug: roleSlug, p_password: password }), "assignStaffRole");
}

export async function revokeStaffRole(userId: string, roleSlug: string, password: string): Promise<void> {
  done(await supabase.rpc("admin_revoke_staff_role", { p_user_id: userId, p_role_slug: roleSlug, p_password: password }), "revokeStaffRole");
}

// ---- Roles & access, role status, profile creation, audit trail, gate password ----
// Same RPCs App/'s Admin page uses (0006/0013/0014/0026); each is authorised
// in the database (admin tier / users.update / superadmin as noted).

export async function listRoleSlugs(): Promise<{ slug: string; isAdmin: boolean }[]> {
  const list = rows(await supabase.from("role_definitions").select("slug, is_admin").order("sort_order"), "listRoleSlugs") as Record<string, unknown>[];
  return list.map((r) => ({ slug: r.slug as string, isAdmin: Boolean(r.is_admin) }));
}

export async function updateRoleStatus(roleId: string, status: "incomplete" | "pending_verification" | "verified"): Promise<void> {
  done(await supabase.rpc("admin_update_user_role", { p_role_id: roleId, p_status: status }), "updateRoleStatus");
}

export async function createProfile(args: { name: string; email: string; role: string; kind: "individual" | "organisation"; password?: string }): Promise<void> {
  done(await supabase.rpc("admin_create_user", { p_name: args.name, p_email: args.email, p_role: args.role, p_kind: args.kind, p_password: args.password ?? null }), "createProfile");
}

export async function reassignRole(roleId: string, newRole: string, password: string): Promise<void> {
  done(await supabase.rpc("admin_reassign_user_role", { p_role_id: roleId, p_new_role: newRole, p_password: password }), "reassignRole");
}

export async function removeRole(roleId: string, password: string): Promise<void> {
  done(await supabase.rpc("admin_remove_user_role", { p_role_id: roleId, p_password: password }), "removeRole");
}

export async function listProfileFeatures(profileType: string): Promise<string[]> {
  const list = rows(await supabase.from("profile_features").select("feature_key").eq("profile_type", profileType), "listProfileFeatures") as Record<string, unknown>[];
  return list.map((r) => r.feature_key as string);
}

export async function setProfileFeatures(profileType: string, featureKeys: string[], password: string): Promise<void> {
  done(await supabase.rpc("admin_set_profile_features", { p_profile_type: profileType, p_feature_keys: featureKeys, p_password: password }), "setProfileFeatures");
}

export async function listConsoleTabs(role: string): Promise<string[]> {
  const list = rows(await supabase.from("console_role_tabs").select("tab_key").eq("role", role), "listConsoleTabs") as Record<string, unknown>[];
  return list.map((r) => r.tab_key as string);
}

export async function setConsoleTabs(role: string, tabKeys: string[], password: string): Promise<void> {
  done(await supabase.rpc("admin_set_console_role_tabs", { p_role: role, p_tab_keys: tabKeys, p_password: password }), "setConsoleTabs");
}

export interface AuditEvent {
  seq: number; occurredAt: string; actorName: string | null; actorEmail: string | null; actorLabel: string; action: string;
  objectTable: string; reason: string | null; beforeData: unknown; afterData: unknown;
}

export async function listAuditEvents(objectTable?: string): Promise<AuditEvent[]> {
  const list = rows(await supabase.rpc("admin_list_audit_events", { p_limit: 200, p_object_table: objectTable ?? null }), "listAuditEvents") as Record<string, unknown>[];
  return list.map((r) => ({
    seq: Number(r.seq), occurredAt: r.occurred_at as string, actorName: (r.actor_name as string) ?? null, actorEmail: (r.actor_email as string) ?? null,
    actorLabel: r.actor_label as string, action: r.action as string, objectTable: r.object_table as string, reason: (r.reason as string) ?? null,
    beforeData: r.before_data, afterData: r.after_data,
  }));
}

export async function setGatePassword(current: string, next: string): Promise<void> {
  done(await supabase.rpc("admin_set_gate_password", { p_gate: "admin", p_current: current, p_new: next }), "setGatePassword");
}

export const APP_FEATURES: { key: string; label: string }[] = [
  { key: "savings", label: "Savings" }, { key: "p2p", label: "P2P" }, { key: "games", label: "Games" }, { key: "travel", label: "Travel" },
  { key: "shop", label: "Shop" }, { key: "fundraise", label: "Fundraise" }, { key: "invest", label: "Invest" }, { key: "groups", label: "Groups" },
  { key: "pos", label: "POS" }, { key: "payment_links", label: "Payment links" }, { key: "payouts", label: "Payouts" }, { key: "treasury_hub", label: "Treasury" },
  { key: "gov_hub", label: "Gov Hub" }, { key: "api_hub", label: "API Hub" }, { key: "register_customer", label: "Register customer" }, { key: "admin_panel", label: "Admin panel" },
];
export const CONSOLE_ROLES = ["Personal", "Merchant", "Agent", "Treasury", "Institution", "NGO", "Group", "Other"];
export const CONSOLE_TABS = ["overview", "transactions", "payouts", "merchants", "agents", "mandates", "grants", "members"];

// ---- AI-assisted escalation triage (0027 + App/convex/aiSupportAssist.ts) ----
export type TriageAction = "approve" | "reject" | "request_info";
export interface AiSuggestion {
  id: string; escalationId: string; source: "ai" | "rules"; priority: "low" | "medium" | "high" | "urgent"; category: string;
  summary: string; recommendedAction: TriageAction; rationale: string; draftReply: string; confidence: number;
  status: "suggested" | "used" | "dismissed"; createdAt: string; createdByName: string | null;
}

const toSuggestion = (r: Record<string, unknown>): AiSuggestion => ({
  id: r.id as string, escalationId: r.escalation_id as string, source: r.source as AiSuggestion["source"], priority: r.priority as AiSuggestion["priority"],
  category: r.category as string, summary: r.summary as string, recommendedAction: r.recommended_action as TriageAction, rationale: r.rationale as string,
  draftReply: r.draft_reply as string, confidence: Number(r.confidence), status: r.status as AiSuggestion["status"], createdAt: r.created_at as string,
  createdByName: (r.created_by_name as string) ?? null,
});

export async function listAiSuggestions(): Promise<AiSuggestion[]> {
  return (rows(await supabase.rpc("support_list_ai_suggestions"), "listAiSuggestions") as Record<string, unknown>[]).map(toSuggestion);
}

export async function markAiSuggestion(id: string, status: "used" | "dismissed"): Promise<void> {
  done(await supabase.rpc("support_mark_ai_suggestion", { p_suggestion_id: id, p_status: status }), "markAiSuggestion");
}

// AI first (Claude via the Convex endpoint, using this user's own session);
// falls back to the in-database rules triage when AI is not configured.
export async function runTriage(escalationId: string): Promise<{ suggestion: AiSuggestion; via: "ai" | "rules"; fallbackReason?: string }> {
  const site = import.meta.env.VITE_CONVEX_SITE_URL as string | undefined;
  let fallbackReason = "AI is not configured";
  if (site) {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (token) {
        const res = await fetch(`${site}/aiSupportAssist`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ escalationId }),
        });
        const body = (await res.json().catch(() => ({}))) as { suggestion?: Record<string, unknown>; error?: string; message?: string };
        if (res.ok && body.suggestion) return { suggestion: toSuggestion(body.suggestion), via: "ai" };
        if (res.status === 403 || res.status === 401) throw new Error(body.message ?? "Not permitted");
        fallbackReason = body.error === "not_configured" ? "AI is not configured" : "AI is unavailable";
      }
    } catch (e) {
      if (e instanceof Error && /permitted|permission|forbidden/i.test(e.message)) throw e;
      fallbackReason = "AI is unreachable";
    }
  }
  const r = await supabase.rpc("support_rules_triage", { p_escalation_id: escalationId });
  if (r.error || !r.data) throw new Error(r.error?.message ?? "triage failed");
  return { suggestion: toSuggestion(r.data as Record<string, unknown>), via: "rules", fallbackReason };
}
