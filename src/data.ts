import type { Locale, RowState, TabKey } from "./types.ts";

// The structural data that used to live here as hardcoded consts (ROLE_ORDER,
// CAPS, ROWS, MANDATES, GRANTS, MEMBERS, BATCHES, MERCHANTS, AGENTS, QUEUE,
// POSITIONS, ROLE_SCOPE, RANGE_SCALE, FX, VIEW_ROWS) now lives in Supabase —
// see src/lib/backend.ts's fetchConsoleData()/fetchRolesAndCaps() and
// supabase/migrations/0004_capability_registry.sql /
// 0005_wallet_view_quote_transfer.sql's console_* tables. What's left here
// are pure, data-independent helpers: a fixed enum, a number formatter, and
// a static style-class lookup — none of these represent business data that
// could be wrong or out of date, so there's nothing to migrate.

export const TAB_KEYS: TabKey[] = [
  "overview",
  "transactions",
  "payouts",
  "merchants",
  "agents",
  "mandates",
  "grants",
  "members",
];

const NUMBER_LOCALE: Record<Locale, string> = { en: "en-GB", fr: "fr-FR", pt: "pt-PT", es: "es-ES" };

export const fmtNum = (n: number, dec: number, locale: Locale = "fr") =>
  n.toLocaleString(NUMBER_LOCALE[locale], { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ | /g, " ");

export const STATE_CLS: Record<RowState, "tag-accent-2" | "tag-outline" | "tag-neutral" | "tag-accent"> = {
  Settled: "tag-accent-2",
  Pending: "tag-outline",
  Review: "tag-neutral",
  Failed: "tag-accent",
};
