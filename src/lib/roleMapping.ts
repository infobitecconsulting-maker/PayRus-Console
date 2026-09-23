// DB-canonical role slugs (user_roles.role) vs. the display-cased Role type
// this console's UI is keyed off (data.ts/i18n.ts's roleOrder, caps, ...).
// The mapping itself lives in the public.role_definitions table
// (supabase/migrations/0022) — `console_role` and `is_admin` per slug — so
// App/ and this console read one source instead of two hardcoded copies.
// Any role read from or written to the shared user_roles table must go
// through here: writing "Personal" instead of "personal" silently breaks the
// *other* app's role gating for the same account.
//
// "admin" has no slot in this console's Role vocabulary; its row maps to
// Treasury (full dashboard content) and is_admin is the real access bypass.
import type { Role } from "../types.ts";
import { supabase } from "./supabase-client.ts";

interface RoleDefinitionRow { slug: string; console_role: string; is_admin: boolean; sort_order: number }

let definitions: RoleDefinitionRow[] = [];
let loading: Promise<void> | null = null;

// Idempotent; call before the first sync lookup (App.tsx does at sign-in).
export function loadRoleDefinitions(): Promise<void> {
  if (definitions.length > 0) return Promise.resolve();
  if (loading) return loading;
  const p: Promise<void> = (async () => {
    try {
      const { data, error } = await supabase
        .from("role_definitions")
        .select("slug, console_role, is_admin, sort_order")
        .order("sort_order");
      if (error) throw new Error(`loadRoleDefinitions: ${error.message}`);
      definitions = (data ?? []) as RoleDefinitionRow[];
    } finally {
      loading = null;
    }
  })();
  loading = p;
  return p;
}

export function dbRoleToConsoleRole(dbRole: string): Role {
  return (definitions.find((d) => d.slug === dbRole)?.console_role as Role | undefined) ?? "Other";
}

export function isAdminDbRole(dbRole: string): boolean {
  return definitions.find((d) => d.slug === dbRole)?.is_admin ?? false;
}

export function consoleRoleToDbSlug(role: Role): string {
  const def = definitions.find((d) => !d.is_admin && d.console_role === role);
  if (!def) throw new Error(`consoleRoleToDbSlug: no role_definitions row for ${role}`);
  return def.slug;
}
