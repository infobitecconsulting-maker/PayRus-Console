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
export interface SettingsCopy {
  button: string;
  headline: string;
  subtitle: string;
  secProfile: string;
  secSecurity: string;
  secNotifications: string;
  secAppearance: string;
  secPayments: string;
  secPrivacy: string;
  secAbout: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  country: string;
  currency: string;
  kyc: string;
  roles: string;
  notSet: string;
  save: string;
  saved: string;
  saveFailed: string;
  changePassword: string;
  newPassword: string;
  confirmPassword: string;
  updatePassword: string;
  passwordUpdated: string;
  passwordMismatch: string;
  passwordShort: string;
  signOutOthers: string;
  signOutOthersDesc: string;
  signedOutOthers: string;
  noNotifications: string;
  markRead: string;
  unread: string;
  languageLabel: string;
  fxCurrencyLabel: string;
  fxCurrencyDesc: string;
  fxAuto: string;
  wallets: string;
  cards: string;
  noWallets: string;
  exportData: string;
  exportDesc: string;
  download: string;
  privacyNote: string;
  fxTickerTitle: string;
  fxUpdated: string;
  fxAttribution: string;
  version: string;
  loading: string;
  fxLive: string;
  fxTitle: string;
  fxTitleNoTime: string;
  fxUnavailable: string;
  locTitle: string;
  locDesc: string;
  locCountry: string;
  locUpdated: string;
  locFailed: string;
  locDenied: string;
  locBtn: string;
  locFilled: string;
  postalLooking: string;
  postalNone: string;
  areaLabel: string;
}

export interface ReceiverPageCopy {
  memberAdvantage: string;
  cta: string;
  ctaDesc: string;
  title: string;
  subtitle: string;
  back: string;
  saved: string;
  fullName: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  emailHint: string;
  receivesIn: string;
  memberFound: string;
  memberPerks: string;
  sendToWallet: string;
  method: string;
  method_mobile_money: string;
  method_bank: string;
  method_cash_pickup: string;
  eta_mobile_money: string;
  eta_bank: string;
  eta_cash_pickup: string;
  provider: string;
  mmNumber: string;
  bankName: string;
  account: string;
  idTypeLabel: string;
  idNumber: string;
  idHint: string;
  idType_passport: string;
  idType_national_id: string;
  idType_driving_licence: string;
  idType_residence_permit: string;
  continue: string;
  requiredFields: string;
  youSend: string;
  payFrom: string;
  note: string;
  fee: string;
  theyGet: string;
  total: string;
  balance: string;
  insufficient: string;
  review: string;
  to: string;
  methodLabel: string;
  countryLabel: string;
  memberNudge: string;
  confirm: string;
  sending: string;
  failed: string;
  success: string;
  sentTo: string;
  pickupCode: string;
  copy: string;
  copied: string;
  pickupHelp: string;
  another: string;
  payouts: string;
  noPayouts: string;
  status_processing: string;
  status_ready_for_pickup: string;
  status_paid_out: string;
  status_blocked: string;
  status_cancelled: string;
  pickup_button: string;
  pickup_title: string;
  pickup_intro: string;
  pickup_code: string;
  pickup_id: string;
  pickup_confirm: string;
  pickup_paid: string;
  pickup_notFound: string;
  pickup_mismatch: string;
  pickup_blocked: string;
  pickup_notAllowed: string;
  step_who: string;
  step_how: string;
  fullAddress: string;
  addressHint: string;
  requiredBasics: string;
  extraNeeded: string;
  mmHint: string;
  pickupPoint: string;
  pickupAt: string;
  agents_title: string;
  agents_searching: string;
  agents_none: string;
  agents_located: string;
  agents_byCity: string;
  agents_direct: string;
  agents_correspondent: string;
  agents_away: string;
  agents_sameCity: string;
}

export interface SendPageCopy {
  button: string;
  headline: string;
  subtitle: string;
  signIn: string;
  findLabel: string;
  findPlaceholder: string;
  find: string;
  checking: string;
  findNote: string;
  yourContacts: string;
  sentTimes: string;
  lastSent: string;
  noContactMatch: string;
  notFound: string;
  cannotSelf: string;
  amountLabel: string;
  currencyLabel: string;
  noteLabel: string;
  notePh: string;
  fee: string;
  total: string;
  balance: string;
  insufficient: string;
  review: string;
  back: string;
  confirmTitle: string;
  confirm: string;
  sending: string;
  success: string;
  sentTo: string;
  from: string;
  to: string;
  reference: string;
  another: string;
  failed: string;
}

export interface OrgPageCopy {
  button: string;
  headline: string;
  subtitle: string;
  loading: string;
  none: string;
  noOrg: string;
  orgLabel: string;
  levelLabel: string;
  tabCases: string;
  tabTransactions: string;
  tabCustomers: string;
  tabUnits: string;
  tabAccess: string;
  tabGovernance: string;
  close: string;
  add: string;
  create: string;
  suspend: string;
  reactivate: string;
  saved: string;
  openCase: string;
  subject: string;
  describe: string;
  priority: string;
  kind: string;
  statusLabel: string;
  all: string;
  slaDue: string;
  slaBreached: string;
  escalatedN: string;
  ownedBy: string;
  raisedBy: string;
  routingNote: string;
  reasonPh: string;
  comment: string;
  escalate: string;
  resolveBtn: string;
  closeBtn: string;
  requestApproval: string;
  approve: string;
  reject: string;
  approvalsTitle: string;
  requestedLabel: string;
  decisionLabel: string;
  differentPerson: string;
  timeline: string;
  aiTitle: string;
  aiRules: string;
  aiAnalyse: string;
  aiReanalyse: string;
  aiAnalysing: string;
  aiEmpty: string;
  aiReady: string;
  aiFallback: string;
  aiSuggests: string;
  aiSecond: string;
  aiNext: string;
  aiDraft: string;
  aiUse: string;
  aiUsed: string;
  aiDismiss: string;
  actComplete: string;
  actRefund: string;
  actCloseDispute: string;
  txIntro: string;
  initiatedIn: string;
  home: string;
  openCaseFor: string;
  nameLabel: string;
  phoneLabel: string;
  dobLabel: string;
  addressLabel: string;
  sensitiveTitle: string;
  sensitiveNote: string;
  breakGlassPh: string;
  breakGlassBtn: string;
  breakGlassDone: string;
  fullAccess: string;
  fullAccessShort: string;
  membersTitle: string;
  emailPh: string;
  templateLabel: string;
  grantNote: string;
  unitsTitle: string;
  unitNamePh: string;
  countryPh: string;
  inheritNote: string;
  depth: string;
  accessIntro: string;
  windowOpen: string;
  windowClosed: string;
  govIntro: string;
  levelsTitle: string;
}

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
  tabAccess: string;
  tabAudit: string;
  allTables: string;
  auditNote: string;
  auditBefore: string;
  auditAfter: string;
  auditDenied: string;
  gateTitle: string;
  gateNote: string;
  gateCurrent: string;
  gateNew: string;
  gateChange: string;
  gateChanged: string;
  accessRolesTitle: string;
  accessRolesNote: string;
  accessFeaturesTitle: string;
  accessFeaturesNote: string;
  accessConsoleTitle: string;
  accessConsoleNote: string;
  manage: string;
  reassign: string;
  remove: string;
  roleStatus: string;
  addProfile: string;
  kindIndividual: string;
  kindOrganisation: string;
  create: string;
  created: string;
  walletsLabel: string;
  adminOnly: string;
  escReasonLabel: string;
  escReasonPlaceholder: string;
  escReasonRejection: string;
  escReasonDecision: string;
  escShow: string;
  escOpenOnly: string;
  escAll: string;
  escHighestFirst: string;
  aiAssistant: string;
  aiRules: string;
  aiAnalyse: string;
  aiReanalyse: string;
  aiAnalysing: string;
  aiEmpty: string;
  aiSuggests: string;
  aiDraftReply: string;
  aiUseReply: string;
  aiReady: string;
  aiFallback: string;
  aiActApprove: string;
  aiActReject: string;
  aiActInfo: string;
  escRejected: string;
  escDoneNote: string;
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
  settings: SettingsCopy;
  adminPage: AdminPageCopy;
  orgPage: OrgPageCopy;
  sendPage: SendPageCopy;
  receiverPage: ReceiverPageCopy;
  config: ConfigCopy;
  registerCustomer: RegisterCustomerCopy;
}
