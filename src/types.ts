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

// The KYC step inserted between role selection (ProfilePicker) and the
// dashboard — App/'s equivalent (src/pages/profile/page.tsx's "id"/"selfie"
// steps) requires the same three uploads before a role activates.
export interface KycCopy {
  headline: string;
  subtitle: string;
  idFrontLabel: string;
  idBackLabel: string;
  selfieLabel: string;
  uploadPrompt: string;
  uploading: string;
  uploaded: string;
  continueLabel: string;
  saveFailed: string;
}

// The Treasury-only Configuration screen — mirrors App/'s admin Configuration
// tab (src/pages/admin/_components/config-panel.tsx): FX margin/commission
// editing, a manual live-rate refresh trigger, and the blocked-transfer /
// pending-profile recovery tools from supabase/migrations/
// 0013_fx_margin_config_and_live_rates.sql.
export interface AdminPageCopy {
  button: string;
  headline: string;
  subtitle: string;
  tabUsers: string;
  tabTransactions: string;
  tabEscalations: string;
  tabStaff: string;
  search: string;
  allCallers: string;
  callerLabel: string;
  edit: string;
  close: string;
  save: string;
  saved: string;
  name: string;
  phone: string;
  country: string;
  currency: string;
  kyc: string;
  complete: string;
  closeDispute: string;
  refund: string;
  voidTx: string;
  creditUser: string;
  escalate: string;
  approve: string;
  reject: string;
  markDone: string;
  sendEscalation: string;
  requestedChange: string;
  userReported: string;
  assign: string;
  revoke: string;
  matrixTitle: string;
  readOnlyNote: string;
  loading: string;
  empty: string;
  roleLabel: string;
  notePrompt: string;
  reasonPrompt: string;
  passwordPrompt: string;
  amountPrompt: string;
  noAccess: string;
  selectUser: string;
  deleteNote: string;
}

export interface ConfigCopy {
  headline: string;
  subtitle: string;
  marginTitle: string;
  marginNote: string;
  currentMargin: string;
  currentCommission: string;
  setBy: string;
  newMarginLabel: string;
  newCommissionLabel: string;
  noteLabel: string;
  notePlaceholder: string;
  passwordLabel: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  liveRatesTitle: string;
  liveRatesNote: string;
  lastUpdated: string; // template, %1 = date, %2 = currency count, %3 = source
  refreshNow: string;
  refreshing: string;
  refreshed: string; // template, %1 = count, %2 = source
  refreshFailed: string; // template, %1 = error message
  attribution: string;
  blockedTitle: string;
  blockedNote: string;
  nothingBlocked: string;
  resolve: string;
  cancel: string;
  moveTo: string;
  confirm: string;
  resolveFailed: string;
  resolveSaved: string;
  pendingTitle: string;
  pendingNote: string;
  nothingPending: string;
  activate: string;
  activating: string;
  activateFailed: string;
  activated: string;
  loading: string;
  expensesTitle: string;
  expensesNote: string;
  nothingExpenses: string;
  approve: string;
  reject: string;
  expenseResolved: string;
  expenseFailed: string;
  cardsTitle: string;
  cardsNote: string;
  nothingCards: string;
  loyaltyTitle: string;
  loyaltyNote: string;
  nothingLoyalty: string;
  betsTitle: string;
  betsNote: string;
  nothingBets: string;
  tontineTitle: string;
  tontineNote: string;
  nothingTontine: string;
  pitchesTitle: string;
  pitchesNote: string;
  nothingPitches: string;
}

// Agent/Treasury-assisted manual registration — mirrors App/'s
// src/pages/register-customer/page.tsx, same admin_create_user RPC.
export interface RegisterCustomerCopy {
  headline: string;
  subtitle: string;
  name: string;
  email: string;
  role: string;
  kind: string;
  kindIndividual: string;
  kindOrganisation: string;
  submit: string;
  saving: string;
  created: string;
  alreadyExisted: string;
  saveFailed: string;
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
  adminRoleTitle: string;
  adminRoleNote: string;
  adminPasswordLabel: string;
  adminUnlock: string;
  adminWrongPassword: string;
  signOut: string;
  switchProfile: string;
  configButton: string;
  registerCustomerButton: string;
  locked: string;
  termsNote: string;
  filters: string[];
  back: string;
  kpiText: Record<Role, KpiText[]>;
  queueText: QueueText[];
  fxNotes: string[];
  landing: LandingCopy;
  register: RegisterCopy;
  kyc: KycCopy;
  adminPage: AdminPageCopy;
  config: ConfigCopy;
  registerCustomer: RegisterCustomerCopy;
}
