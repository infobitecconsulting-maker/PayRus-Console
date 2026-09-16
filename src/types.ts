export type Role =
  | "Personal"
  | "Merchant"
  | "Agent"
  | "Treasury"
  | "Institution"
  | "NGO"
  | "Group"
  | "Other";

export type TabKey =
  | "overview"
  | "transactions"
  | "payouts"
  | "merchants"
  | "agents"
  | "mandates"
  | "grants"
  | "members";

export type RowState = "Settled" | "Pending" | "Review" | "Failed";

export type Who = "personal" | "merchant" | "agent" | "institution" | "ngo" | "group";

export interface LedgerRow {
  who?: Who;
  name: string;
  meta: string;
  corridor: string;
  rail: string;
  amount: string;
  fee: string;
  state: RowState;
}

// Structural data only — the copy (title/badge/note/primary/secondary) lives
// in Desk.queueText, index-aligned with the QUEUE array so it can be
// translated per locale without duplicating the role/severity wiring.
export interface QueueItem {
  roles: Role[];
  cls: "tag-neutral" | "tag-accent" | "tag-outline";
}

export interface Position {
  total: string;
  pockets: [code: string, amt: string, pct: string, isGreen: 0 | 1][];
}

// Structural/numeric data only — label/note/text copy lives in
// Desk.kpiText[role], index-aligned with this role's kpis array.
export interface Kpi {
  n: number | null;
  dec?: number;
  suffix?: string;
  flow: boolean;
  noteNums?: { v: number; flow: boolean }[];
}

export interface RoleScope {
  sees: Who[];
  kpis: Kpi[];
  bars: [label: string, eur: number][];
}

export type Locale = "en" | "fr" | "pt" | "es";

export interface KpiText {
  label: string;
  note: string;
  // Overrides the computed fmtNum(...) value for non-numeric KPIs (e.g. "T+1", "28 Mar").
  text?: string;
}

export interface QueueText {
  title: string;
  badge: string;
  note: string;
  primary: string;
  secondary: string;
}

// Mirrors App/src/pages/register/page.tsx's field set and flow (real
// supabase.auth.signUp, same "details" then "checkEmail" steps) so the
// console's registration screen offers the same features/structure as the
// consumer app's, not the standalone org+OTP wizard this replaced.
export interface RegisterCopy {
  headline: string;
  subtitle: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  countryPlaceholder: string;
  phone: string;
  street: string;
  houseNumber: string;
  city: string;
  cityPlaceholder: string;
  province: string;
  provincePlaceholder: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  submit: string;
  allFieldsRequired: string;
  passwordTooShort: string;
  passwordMismatch: string;
  saveFailed: string;
  ssoTitle: string;
  ssoButton: string;
  checkEmailHeadline: string;
  checkEmailSubtitle: string; // template, "%1" = the submitted email
  backToSignin: string;
}

export interface LandingCopy {
  kicker: string;
  title: string;
  sub: string;
  ctaStart: string;
  ctaSignIn: string;
  featuresTitle: string;
  features: { title: string; desc: string }[];
  trustedBy: string;
  footerNote: string;
}

export interface Desk {
  tabs: string[];
  ranges: string[];
  kicker: string;
  title: string;
  chartTitle: string;
  chartNote: string;
  tableTitle: string;
  cols: string[];
  states: Record<RowState, string>;
  position: string;
  positionNote: string;
  queueTitle: string;
  fxTitle: string;
  language: string;
  pilotClient: string;
  pilotBadge: string;
  roleLabel: string;
  logoAlt: string;
  logoHomeLabel: string;
  roles: string[];
  roleNotes: string[];
  roleHeadlines: (string | null)[];
  positionTitles: string[];
  positionNotes: string[];
  chartTitles: string[];
  tableTitles: string[];
  emptyRows: string;
  colsPayouts: string[];
  colsMerchants: string[];
  colsAgents: string[];
  colsMandates: string[];
  colsGrants: string[];
  colsMembers: string[];
  ledger: string;
  batches: string;
  merchantRoster: string;
  agentRoster: string;
  mandateRoster: string;
  grantRoster: string;
  memberRoster: string;
  welcomeTitle: string;
  welcomeSub: string;
  email: string;
  password: string;
  signIn: string;
  sso: string;
  ssoWorkEmailLabel: string;
  ssoContinueButton: string;
  ssoFailed: string;
  ssoInvalidEmail: string;
  checking: string;
  signInFailed: string;
  orDivider: string;
  quickSignInTitle: string;
  noAccount: string;
  registerLink: string;
  forgotPassword: string;
  resetLinkSent: string;
  magicLinkPrompt: string;
  magicLinkSend: string;
  magicLinkSent: string;
  phoneOtpPrompt: string;
  phoneOtpNumberLabel: string;
  phoneOtpSendCode: string;
  phoneOtpCodeLabel: string;
  phoneOtpVerify: string;
  phoneOtpSent: string;
  chooseProfile: string;
  chooseProfileNote: string;
  signOut: string;
  switchProfile: string;
  locked: string;
  termsNote: string;
  filters: string[];
  back: string;
  kpiText: Record<Role, KpiText[]>;
  queueText: QueueText[];
  fxNotes: string[];
  landing: LandingCopy;
  register: RegisterCopy;
}
