// Thin wrappers around the same RPCs/tables App/src/lib/backend.ts's
// "Identity" and "User roles" sections use — same Supabase project, same
// schema (supabase/migrations/0006_app_rpc_functions.sql,
// 0010_kyc_documents.sql). ops-console is a separate package with no way to
// import App's TS directly, so these are duplicated rather than shared, same
// convention already used for geo.ts/address.ts. Until now ops-console only
// ever called supabase.auth.* (real identity, no real profile/role record) —
// this is what gives it one, unifying it with App at the data layer, not
// just the auth layer.
import { supabase } from "./supabase-client.ts";

export interface UserRole {
  id: string;
  userId: string;
  role: string;
  kind: "individual" | "organisation";
  status: "incomplete" | "pending_verification" | "verified";
  idFrontDocPath: string | null;
  idBackDocPath: string | null;
  selfieDocPath: string | null;
}

function mustHaveData<T>(res: { data: T | null; error: { message: string } | null }, label: string): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  if (res.data === null) throw new Error(`${label}: expected data, got null`);
  return res.data;
}

export async function upsertSupabaseUser(args: {
  supabaseUserId: string;
  email: string;
  name?: string;
}): Promise<{ userId: string; name: string }> {
  const res = await supabase.rpc("upsert_supabase_user", {
    p_auth_user_id: args.supabaseUserId, p_email: args.email, p_name: args.name ?? null,
    p_first_name: null, p_last_name: null,
  });
  const row = mustHaveData(res, "upsertSupabaseUser") as Record<string, unknown>;
  return { userId: row.id as string, name: (row.name as string) ?? args.email };
}

// Password-gated (gate 'admin' in gate_passwords, checked server-side by
// admin_grant_admin_role) — the only way to obtain the admin role here.
export async function grantAdminRole(userId: string, password: string): Promise<void> {
  const res = await supabase.rpc("admin_grant_admin_role", { p_user_id: userId, p_password: password });
  if (res.error) throw new Error(res.error.message);
}

export async function listUserRoles(userId: string): Promise<UserRole[]> {
  const res = await supabase.from("user_roles").select("*").eq("user_id", userId);
  return mustHaveData(res, "listUserRoles").map((r) => ({
    id: r.id, userId: r.user_id, role: r.role, kind: r.kind, status: r.status,
    idFrontDocPath: r.id_front_doc_path, idBackDocPath: r.id_back_doc_path, selfieDocPath: r.selfie_doc_path,
  }));
}

// Same admin/agent-assisted manual registration RPC App/'s register-customer
// page uses (0007_admin_password_gate.sql's password-gated
// admin_create_user) — lets an Agent create a real user+role record for a
// customer who can't complete self-service sign-up themselves.
export async function adminCreateUser(args: {
  name: string; email: string; role: string; kind: "individual" | "organisation"; password?: string;
}): Promise<{ userId: string; roleId: string; alreadyExisted: boolean }> {
  const res = await supabase.rpc("admin_create_user", { p_name: args.name, p_email: args.email, p_role: args.role, p_kind: args.kind, p_password: args.password ?? null });
  const row = (mustHaveData(res, "adminCreateUser") as Record<string, unknown>[])[0];
  return { userId: row.user_id as string, roleId: row.role_id as string, alreadyExisted: row.already_existed as boolean };
}

export async function upsertUserRole(args: {
  userId: string;
  role: string;
  kind: "individual" | "organisation";
  idFrontDocPath?: string;
  idBackDocPath?: string;
  selfieDocPath?: string;
}): Promise<string> {
  const res = await supabase.rpc("upsert_user_role", {
    p_user_id: args.userId, p_role: args.role, p_kind: args.kind,
    p_id_front_doc_path: args.idFrontDocPath ?? null, p_id_back_doc_path: args.idBackDocPath ?? null,
    p_selfie_doc_path: args.selfieDocPath ?? null,
  });
  const row = mustHaveData(res, "upsertUserRole") as Record<string, unknown>;
  return row.id as string;
}
