import type { LedgerRow, Locale, Position, QueueItem, Role, RoleScope, RowState, TabKey } from "./types.ts";

export const ROLE_ORDER: Role[] = [
  "Personal",
  "Merchant",
  "Agent",
  "Treasury",
  "Institution",
  "NGO",
  "Group",
  "Other",
];

export const CAPS: Record<Role, TabKey[]> = {
  Personal: ["overview", "transactions"],
  Institution: ["overview", "transactions", "payouts", "mandates"],
  NGO: ["overview", "transactions", "payouts", "grants"],
  Group: ["overview", "transactions", "members"],
  Other: ["overview", "transactions"],
  Merchant: ["overview", "transactions", "payouts", "merchants"],
  Agent: ["overview", "transactions", "agents"],
  Treasury: ["overview", "transactions", "payouts", "merchants", "agents"],
};

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

export const ROWS: LedgerRow[] = [
  { who: "merchant", name: "Bitec SARL", meta: "Invoice 2026-118", corridor: "EUR → XAF", rail: "GIMAC", amount: "18 420,00 EUR", fee: "147,36", state: "Settled" },
  { who: "personal", name: "Amina Ngoy", meta: "Remittance · Kinshasa", corridor: "EUR → USD", rail: "M-Pesa USD", amount: "220,00 USD", fee: "1,76", state: "Pending" },
  { who: "merchant", name: "Sonangol Distribuição", meta: "Supplier settlement", corridor: "EUR → AOA", rail: "Bank / IBAN", amount: "9 860,00 EUR", fee: "78,88", state: "Settled" },
  { who: "personal", name: "Jean-Paul Mbarga", meta: "PayRus tag · Douala", corridor: "EUR → XAF", rail: "PayRus tag", amount: "125,00 EUR", fee: "1,00", state: "Settled" },
  { who: "agent", name: "Agent float · Libreville", meta: "Cash-in reconciliation", corridor: "XAF", rail: "Agent network", amount: "760,00 EUR", fee: "6,08", state: "Review" },
  { who: "merchant", name: "Card acquiring batch", meta: "142 card payments", corridor: "EUR", rail: "Card scheme", amount: "3 218,40 EUR", fee: "45,06", state: "Settled" },
  { who: "merchant", name: "Unitel Angola", meta: "Airtime aggregation", corridor: "EUR → AOA", rail: "Aggregator", amount: "412,90 EUR", fee: "3,30", state: "Failed" },
  { who: "institution", name: "Municipal tax receipts", meta: "412 payers · QR and agent", corridor: "XAF → EUR", rail: "QR · Agent", amount: "132 600,00 EUR", fee: "1 284", state: "Settled" },
  { who: "institution", name: "Health centre subsidy", meta: "Two signatures received", corridor: "EUR → XAF", rail: "GIMAC", amount: "218 400,00 EUR", fee: "62,00", state: "Settled" },
  { who: "ngo", name: "Cash transfer · Nord-Kivu", meta: "1 240 households", corridor: "USD → CDF", rail: "M-Pesa USD", amount: "186 000,00 USD", fee: "1 240", state: "Pending" },
  { who: "ngo", name: "Field team advances", meta: "18 staff · Kinshasa, Goma", corridor: "USD", rail: "Card", amount: "24 800,00 USD", fee: "18,00", state: "Settled" },
  { who: "group", name: "Cycle 4 contributions", meta: "9 of 12 members", corridor: "EUR", rail: "PayRus tag", amount: "450,00 EUR", fee: "3,60", state: "Settled" },
  { who: "group", name: "Payout · Amina Ngoy", meta: "Scheduled 28 March", corridor: "EUR → USD", rail: "M-Pesa USD", amount: "600,00 EUR", fee: "4,80", state: "Pending" },
  { who: "personal", name: "Canal+ Gabon", meta: "Subscription billing", corridor: "EUR → XAF", rail: "Direct debit", amount: "34,30 EUR", fee: "0,27", state: "Settled" },
  { who: "merchant", name: "AfriKart", meta: "Marketplace commission · Sept", corridor: "EUR", rail: "Marketplace", amount: "1 450,00 EUR", fee: "29,00", state: "Settled" },
];

export const MANDATES: LedgerRow[] = [
  { name: "Teacher salaries · March", meta: "1 842 beneficiaries", corridor: "EUR → XAF", rail: "Bulk payroll", amount: "1 284 000,00 EUR", fee: "1 842", state: "Review" },
  { name: "Health centre subsidy", meta: "Two signatures received", corridor: "EUR → XAF", rail: "GIMAC", amount: "218 400,00 EUR", fee: "62", state: "Settled" },
  { name: "Road works retention", meta: "Held pending inspection", corridor: "EUR", rail: "Bank / IBAN", amount: "96 200,00 EUR", fee: "4", state: "Pending" },
  { name: "Licence fee collections", meta: "412 payers · QR and agent", corridor: "XAF → EUR", rail: "QR · Agent", amount: "48 900,00 EUR", fee: "412", state: "Settled" },
  { name: "Municipal tax receipts", meta: "Inbound · all channels", corridor: "XAF → EUR", rail: "QR · Mobile money", amount: "132 600,00 EUR", fee: "1 284", state: "Settled" },
  { name: "Scholarship fund", meta: "Rejected · budget line closed", corridor: "EUR", rail: "Bulk payroll", amount: "42 000,00 EUR", fee: "180", state: "Failed" },
];

export const GRANTS: LedgerRow[] = [
  { name: "ECHO/2026/HUM-04", meta: "Restricted · 62% disbursed", corridor: "EUR → USD", rail: "Donor account", amount: "840 000,00 EUR", fee: "1 240", state: "Settled" },
  { name: "Cash transfer · Nord-Kivu", meta: "1 240 households", corridor: "USD → CDF", rail: "M-Pesa USD", amount: "186 000,00 USD", fee: "1 240", state: "Pending" },
  { name: "Field team advances", meta: "18 staff · Kinshasa, Goma", corridor: "USD", rail: "Card", amount: "24 800,00 USD", fee: "18", state: "Settled" },
  { name: "Unrestricted reserve", meta: "Board-approved buffer", corridor: "EUR", rail: "Bank / IBAN", amount: "112 400,00 EUR", fee: "1", state: "Settled" },
  { name: "WASH programme · Luanda", meta: "Awaiting donor sign-off", corridor: "EUR → AOA", rail: "Bank / IBAN", amount: "68 200,00 EUR", fee: "96", state: "Review" },
  { name: "Fuel voucher batch", meta: "Aggregator rejected 4 records", corridor: "EUR → AOA", rail: "Aggregator", amount: "12 400,00 EUR", fee: "310", state: "Failed" },
];

export const MEMBERS: LedgerRow[] = [
  { name: "Amina Ngoy", meta: "Next payout · 28 March", corridor: "Kinshasa, CD", rail: "M-Pesa USD", amount: "600,00 EUR", fee: "4", state: "Pending" },
  { name: "Jean-Paul Mbarga", meta: "Paid cycle 4", corridor: "Douala, CM", rail: "PayRus tag", amount: "50,00 EUR", fee: "4", state: "Settled" },
  { name: "Marie Ondo", meta: "Paid cycle 4", corridor: "Libreville, GA", rail: "GIMAC", amount: "50,00 EUR", fee: "4", state: "Settled" },
  { name: "Três membros", meta: "Reminder sent · cycle 4", corridor: "Luanda, AO", rail: "Bank / IBAN", amount: "150,00 EUR", fee: "0", state: "Review" },
  { name: "Group rules", meta: "Two signatures to change rotation", corridor: "—", rail: "Agreed", amount: "—", fee: "12", state: "Settled" },
];

export const BATCHES: LedgerRow[] = [
  { name: "Batch #4471", meta: "GIMAC · 12 Mar", corridor: "EUR → XAF", rail: "GIMAC", amount: "8 420 000 XAF", fee: "142", state: "Settled" },
  { name: "Batch #4470", meta: "M-Pesa · 12 Mar", corridor: "EUR → CDF", rail: "M-Pesa USD", amount: "31 900 000 CDF", fee: "96", state: "Settled" },
  { name: "Card acquiring", meta: "Net of 1,4%", corridor: "EUR", rail: "Card scheme", amount: "2 118 000 XAF", fee: "142", state: "Settled" },
  { name: "EUR corridor sweep", meta: "SEPA · 14:00 cut-off", corridor: "EUR", rail: "SEPA", amount: "38 400,00 EUR", fee: "318", state: "Pending" },
  { name: "USD corridor sweep", meta: "Kinshasa · all channels", corridor: "USD → CDF", rail: "M-Pesa USD", amount: "24 100,00 USD", fee: "204", state: "Pending" },
  { name: "Agent float reconciliation", meta: "31 agents · open", corridor: "XAF", rail: "Agent network", amount: "1 042 000 XAF", fee: "31", state: "Review" },
  { name: "Unitel Angola", meta: "IBAN mismatch on 3", corridor: "EUR → AOA", rail: "Aggregator", amount: "412,90 EUR", fee: "118", state: "Failed" },
];

export const MERCHANTS: LedgerRow[] = [
  { name: "Bitec SARL", meta: "Wholesale · since 2024", corridor: "Libreville, GA", rail: "GIMAC · Card", amount: "184 200,00 EUR", fee: "1 473,60", state: "Settled" },
  { name: "Sonangol Distribuição", meta: "Fuel distribution", corridor: "Luanda, AO", rail: "Bank / IBAN", amount: "98 600,00 EUR", fee: "788,80", state: "Settled" },
  { name: "Canal+ Gabon", meta: "Subscriptions", corridor: "Libreville, GA", rail: "Direct debit", amount: "34 300,00 EUR", fee: "274,40", state: "Settled" },
  { name: "Unitel Angola", meta: "Airtime aggregation", corridor: "Luanda, AO", rail: "Aggregator", amount: "12 900,00 EUR", fee: "103,20", state: "Failed" },
  { name: "Marché Mont-Bouët", meta: "412 stalls · QR only", corridor: "Libreville, GA", rail: "QR · Mobile money", amount: "8 410,00 EUR", fee: "67,28", state: "Pending" },
  { name: "Kin Pharma", meta: "Onboarding · Tier 2", corridor: "Kinshasa, CD", rail: "M-Pesa USD", amount: "0,00 EUR", fee: "0,00", state: "Review" },
  { name: "AfriKart", meta: "Marketplace partner · since 2026", corridor: "Douala, CM", rail: "Marketplace", amount: "14 500,00 EUR", fee: "290,00", state: "Settled" },
];

export const AGENTS: LedgerRow[] = [
  { name: "Libreville network", meta: "31 agents", corridor: "Gabon", rail: "1 042 000 XAF", amount: "4 820 000 XAF", fee: "−1 042 000", state: "Review" },
  { name: "Douala network", meta: "48 agents", corridor: "Cameroon", rail: "2 180 000 XAF", amount: "9 640 000 XAF", fee: "0", state: "Settled" },
  { name: "Kinshasa network", meta: "62 agents · USD", corridor: "DR Congo", rail: "18 400,00 USD", amount: "74 200,00 USD", fee: "−120,00", state: "Pending" },
  { name: "Luanda network", meta: "12 agents", corridor: "Angola", rail: "1 105 000 AOA", amount: "3 420 000 AOA", fee: "0", state: "Settled" },
  { name: "Pointe-Noire pilot", meta: "6 agents · onboarding", corridor: "Congo", rail: "240 000 XAF", amount: "180 000 XAF", fee: "0", state: "Review" },
];

// Copy (title/badge/note/primary/secondary) lives in Desk.queueText, at the
// same index in every locale — keep this array's order and length in sync
// with queueText in src/i18n.ts.
export const QUEUE: QueueItem[] = [
  { roles: ["Treasury", "Agent"], cls: "tag-neutral" },
  { roles: ["Treasury", "Merchant"], cls: "tag-accent" },
  { roles: ["Treasury", "Merchant"], cls: "tag-outline" },
  { roles: ["Treasury"], cls: "tag-neutral" },
  { roles: ["Agent"], cls: "tag-outline" },
  { roles: ["Institution"], cls: "tag-neutral" },
  { roles: ["NGO"], cls: "tag-outline" },
  { roles: ["Group"], cls: "tag-neutral" },
  { roles: ["Other"], cls: "tag-outline" },
  { roles: ["Personal"], cls: "tag-neutral" },
];

export const POSITIONS: Record<Role, Position> = {
  Personal: { total: "30 821,76 EUR", pockets: [
    ["EUR", "18 420,00", "60%", 0], ["USD", "9 860,00", "30%", 0],
    ["XAF", "1 850 400", "9%", 1], ["CDF", "982 000", "1%", 1], ["AOA", "120 500", "1%", 1]] },
  Institution: { total: "1 682 100,00 EUR", pockets: [
    ["EUR", "1 284 000,00", "76%", 0], ["XAF", "218 400 000", "19%", 1], ["CDF", "96 200 000", "5%", 1]] },
  NGO: { total: "1 064 200,00 EUR", pockets: [
    ["EUR", "840 000,00", "79%", 0], ["USD", "186 000,00", "16%", 0], ["CDF", "24 800 000", "3%", 1], ["AOA", "68 200 000", "2%", 1]] },
  Group: { total: "600,00 EUR", pockets: [
    ["EUR", "450,00", "75%", 0], ["XAF", "98 400", "25%", 1]] },
  Other: { total: "0,00 EUR", pockets: [["EUR", "0,00", "0%", 0]] },
  Merchant: { total: "22 615,60 EUR", pockets: [
    ["EUR", "18 420,00", "81%", 0], ["XAF", "2 118 000", "14%", 1], ["AOA", "412 900", "5%", 1]] },
  Agent: { total: "22 645 000 XAF", pockets: [
    ["XAF", "4 820 000", "21%", 0], ["XAF", "9 640 000", "43%", 0],
    ["USD", "18 400,00", "28%", 1], ["AOA", "1 105 000", "8%", 1]] },
  Treasury: { total: "30 821,76 EUR", pockets: [
    ["EUR", "18 420,00", "60%", 0], ["USD", "9 860,00", "30%", 0],
    ["XAF", "1 850 400", "9%", 1], ["CDF", "982 000", "1%", 1], ["AOA", "120 500", "1%", 1]] },
};

// Structural/numeric only — label, note (and text override) live in
// Desk.kpiText[role], index-aligned with each role's kpis array below. When
// editing kpi counts or order here, keep every locale's kpiText[role] in sync.
export const ROLE_SCOPE: Record<Role, RoleScope> = {
  Personal: {
    sees: ["personal"],
    kpis: [
      { n: 30821.76, dec: 2, suffix: " EUR", flow: false },
      { n: 34, dec: 0, flow: true, noteNums: [{ v: 6, flow: true }] },
      { n: 42, dec: 0, suffix: " s", flow: false },
      { n: 9.84, dec: 2, suffix: " EUR", flow: true },
    ],
    bars: [["EUR domestic", 620], ["EUR → XAF", 410], ["EUR → USD", 220], ["EUR → CDF", 145],
           ["EUR → AOA", 0], ["USD → CDF", 0], ["Card", 380]],
  },
  Merchant: {
    sees: ["merchant"],
    kpis: [
      { n: 22615.6, dec: 2, suffix: " EUR", flow: true },
      { n: 418, dec: 0, flow: true, noteNums: [{ v: 142, flow: true }] },
      { n: null, flow: false },
      { n: 275.97, dec: 2, suffix: " EUR", flow: true },
    ],
    bars: [["EUR domestic", 8400], ["EUR → XAF", 6100], ["EUR → USD", 1750], ["EUR → CDF", 900],
           ["EUR → AOA", 2650], ["USD → CDF", 400], ["Card", 3218]],
  },
  Agent: {
    sees: ["agent"],
    kpis: [
      { n: 22645000, dec: 0, suffix: " XAF", flow: false },
      { n: 18640, dec: 0, flow: true },
      { n: 1842, dec: 2, suffix: " EUR", flow: true },
      { n: 1042000, dec: 0, suffix: " XAF", flow: false },
    ],
    bars: [["EUR domestic", 0], ["EUR → XAF", 9640], ["EUR → USD", 0], ["EUR → CDF", 7420],
           ["EUR → AOA", 3420], ["USD → CDF", 4800], ["Card", 0]],
  },
  Institution: {
    sees: ["institution"],
    kpis: [
      { n: 181500, dec: 2, suffix: " EUR", flow: true },
      { n: 1502400, dec: 2, suffix: " EUR", flow: true, noteNums: [{ v: 1842, flow: true }] },
      { n: 1284000, dec: 2, suffix: " EUR", flow: false },
      { n: 96200, dec: 2, suffix: " EUR", flow: false },
    ],
    bars: [["Municipal tax", 132600], ["Licence fees", 48900], ["Salaries", 1284000], ["Subsidies", 218400], ["Retentions", 96200]],
  },
  NGO: {
    sees: ["ngo"],
    kpis: [
      { n: 952400, dec: 2, suffix: " EUR", flow: true },
      { n: 223200, dec: 2, suffix: " EUR", flow: true, noteNums: [{ v: 1240, flow: true }] },
      { n: 840000, dec: 2, suffix: " EUR", flow: false },
      { n: null, flow: false },
    ],
    bars: [["Cash transfers", 186000], ["WASH programme", 68200], ["Field advances", 24800], ["Vouchers", 12400], ["Reserve", 112400]],
  },
  Group: {
    sees: ["group"],
    kpis: [
      { n: 600, dec: 2, suffix: " EUR", flow: false },
      { n: 450, dec: 2, suffix: " EUR", flow: true, noteNums: [{ v: 9, flow: false }] },
      { n: 150, dec: 2, suffix: " EUR", flow: false },
      { n: null, flow: false },
    ],
    bars: [["Contributions", 450], ["Payouts", 600], ["Outstanding", 150]],
  },
  Other: {
    sees: [],
    kpis: [
      { n: 0, dec: 2, suffix: " EUR", flow: false },
      { n: 0, dec: 0, flow: true },
      { n: null, flow: false },
      { n: null, flow: false },
    ],
    bars: [],
  },
  Treasury: {
    sees: ["personal", "merchant", "agent", "institution", "ngo", "group"],
    kpis: [
      { n: 62800, dec: 0, suffix: " EUR", flow: true },
      { n: 1284, dec: 0, flow: true, noteNums: [{ v: 412, flow: true }] },
      { n: 18, dec: 0, suffix: " h", flow: false },
      { n: null, flow: false, noteNums: [{ v: 5, flow: true }, { v: 1284, flow: true }] },
    ],
    bars: [["EUR domestic", 18600], ["EUR → XAF", 15100], ["EUR → USD", 13750], ["EUR → CDF", 6400],
           ["EUR → AOA", 4650], ["USD → CDF", 12000], ["Card", 3950]],
  },
};

// Each range is its own period, not a relabelling of the same week.
export const RANGE_SCALE = [1, 4.2, 12.6];

const NUMBER_LOCALE: Record<Locale, string> = { en: "en-GB", fr: "fr-FR", pt: "pt-PT", es: "es-ES" };

export const fmtNum = (n: number, dec: number, locale: Locale = "fr") =>
  n.toLocaleString(NUMBER_LOCALE[locale], { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ | /g, " ");

export const STATE_CLS: Record<RowState, "tag-accent-2" | "tag-outline" | "tag-neutral" | "tag-accent"> = {
  Settled: "tag-accent-2",
  Pending: "tag-outline",
  Review: "tag-neutral",
  Failed: "tag-accent",
};

// Notes translated in Desk.fxNotes, index-aligned with this array.
export const FX = [
  { pair: "EUR / USD", rate: "1,0800" },
  { pair: "EUR / XAF", rate: "655,957" },
  { pair: "USD / CDF", rate: "2 657,41" },
  { pair: "EUR / AOA", rate: "1 105,00" },
];

export const VIEW_ROWS: Record<TabKey, LedgerRow[]> = {
  overview: ROWS,
  transactions: ROWS,
  payouts: BATCHES,
  merchants: MERCHANTS,
  agents: AGENTS,
  mandates: MANDATES,
  grants: GRANTS,
  members: MEMBERS,
};
