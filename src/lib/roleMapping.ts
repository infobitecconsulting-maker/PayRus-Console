// DB-canonical role slugs (App/'s user_roles.role values, from
// App/src/pages/profile/page.tsx's ROLES list: personal, merchant, agent,
// treasury, public_institution, ngo, group, starter) vs. the display-cased
// Role type this app's entire UI is keyed off (data.ts/i18n.ts's roleOrder,
// caps, kpiText, positions, etc. — all Record<Role, ...>). Any role read
// from or written to the shared user_roles table must go through this
// mapping: writing "Personal" instead of "personal", or reading it back
// without translating, silently breaks the *other* app's own role gating
// and role-scoped views for the same account.
import type { Role } from "../types.ts";

export const ROLE_TO_DB_SLUG: Record<Role, string> = {
  Personal: "personal",
  Merchant: "merchant",
  Agent: "agent",
  Treasury: "treasury",
  Institution: "public_institution",
  NGO: "ngo",
  Group: "group",
  Other: "starter",
};

const DB_SLUG_TO_ROLE: Record<string, Role> = Object.fromEntries(
  Object.entries(ROLE_TO_DB_SLUG).map(([role, slug]) => [slug, role as Role]),
) as Record<string, Role>;

// "admin" has no slot in ops-console's own Role vocabulary at all (unlike
// App/, where isAdmin bypasses every profile-type gate) — falling through
// to the "Other"/starter default would leave a shared admin account with
// the LEAST access in this console, backwards from App/'s behavior for the
// same account. Treasury is the closest existing analog (full dashboard
// content, not a starter shell); isAdminDbRole is the real access bypass,
// used wherever this console needs to grant admin the same "sees
// everything" behavior App/'s isAdmin already gets.
export function dbRoleToConsoleRole(dbRole: string): Role {
  if (dbRole === "admin") return "Treasury";
  return DB_SLUG_TO_ROLE[dbRole] ?? "Other";
}

export function isAdminDbRole(dbRole: string): boolean {
  return dbRole === "admin";
}
