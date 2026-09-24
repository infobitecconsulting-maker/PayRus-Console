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
export interface MyPermissions { isSuperadmin: boolean; users: Perms; transactions: Perms }

export async function getMyPermissions(): Promise<MyPermissions> {
  const list = rows(await supabase.rpc("my_permissions"), "getMyPermissions") as Record<string, unknown>[];
  const pick = (resource: string): Perms => {
    const r = list.find((x) => x.resource === resource);
    return { create: Boolean(r?.can_create), read: Boolean(r?.can_read), update: Boolean(r?.can_update), delete: Boolean(r?.can_delete) };
  };
  return { isSuperadmin: list.some((r) => Boolean(r.is_superadmin)), users: pick("users"), transactions: pick("transactions") };
}

export interface StaffUser {
  id: string; name: string | null; email: string | null; username: string | null; phone: string | null;
  country: string | null; defaultCurrency: string | null; kycStatus: "unverified" | "submitted" | "verified";
  roles: { id: string; role: string; status: string }[]; walletCount: number;
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
