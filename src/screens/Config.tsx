import { useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import {
  getCurrentFxMarginConfig, updateFxMarginConfig, type FxMarginConfig,
  getLastFxRateUpdate, refreshLiveFxRates, type FxRateUpdate,
  adminListBlockedTransfers, adminResolveTransfer, type BlockedTransfer,
  adminListPendingProfiles, adminActivateProfile, type PendingProfile,
  adminListExpenseReports, adminResolveExpenseReport, type AdminExpenseReport,
  adminListCorporateCards, adminListLoyaltyAccounts, adminListGameBets, adminListTontineMembers, adminListPitchSubmissions,
} from "../lib/adminConfig.ts";

// Treasury-only screen mirroring App/'s admin Configuration tab
// (src/pages/admin/_components/config-panel.tsx) — same RPCs/tables, same
// password gate (supabase/migrations/0013_fx_margin_config_and_live_rates.sql),
// reached here via a header button (App.tsx's "config" stage) rather than a
// tab, since Console.tsx's tabs are rigidly data-driven off console_role_tabs.
const RESOLUTION_OPTIONS: Record<string, string[]> = {
  failed: ["pending"],
  disputed: ["resolved", "refunded"],
  refund_pending: ["refunded"],
};

function BlockedTransfersSection({ D }: { D: Desk }) {
  const C = D.config;
  const [transfers, setTransfers] = useState<BlockedTransfer[] | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [targetState, setTargetState] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => void adminListBlockedTransfers().then(setTransfers).catch(() => setTransfers([]));
  useEffect(load, []);

  const handleResolve = async (transferId: string) => {
    if (!targetState || !password) return;
    setSaving(true);
    setMessage(null);
    try {
      await adminResolveTransfer({ transferId, newState: targetState, password });
      setMessage(C.resolveSaved);
      setResolvingId(null);
      setPassword("");
      load();
    } catch {
      setMessage(C.resolveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
      <div className="card-title">{C.blockedTitle}</div>
      <p className="card-body">{C.blockedNote}</p>
      {!transfers && <div className="text-muted" style={{ fontSize: 13 }}>{C.loading}</div>}
      {transfers && transfers.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{C.nothingBlocked}</div>}
      {transfers?.map((t) => (
        <div key={t.transferId} style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.reference} · {t.userName ?? t.userEmail ?? "—"}</div>
              <div style={{ fontSize: 11 }} className="text-muted">{t.currency} {t.amount.toLocaleString()} · {t.state} · {new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setResolvingId(resolvingId === t.transferId ? null : t.transferId)}>
              {resolvingId === t.transferId ? C.cancel : C.resolve}
            </button>
          </div>
          {resolvingId === t.transferId && (
            <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
              <select value={targetState} onChange={(e) => setTargetState(e.target.value)} className="input" style={{ width: "auto" }}>
                <option value="">{C.moveTo}</option>
                {(RESOLUTION_OPTIONS[t.state] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={C.passwordLabel} className="input" style={{ width: 160 }} />
              <button type="button" className="btn btn-primary" disabled={saving || !targetState || !password} onClick={() => void handleResolve(t.transferId)}>
                {saving ? C.saving : C.confirm}
              </button>
            </div>
          )}
        </div>
      ))}
      {message && <div className="tag tag-neutral" style={{ alignSelf: "flex-start" }}>{message}</div>}
    </div>
  );
}

function PendingProfilesSection({ D }: { D: Desk }) {
  const C = D.config;
  const [profiles, setProfiles] = useState<PendingProfile[] | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => void adminListPendingProfiles().then(setProfiles).catch(() => setProfiles([]));
  useEffect(load, []);

  const handleActivate = async (roleId: string) => {
    setActivatingId(roleId);
    setMessage(null);
    try {
      await adminActivateProfile(roleId);
      setMessage(C.activated);
      load();
    } catch {
      setMessage(C.activateFailed);
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
      <div className="card-title">{C.pendingTitle}</div>
      <p className="card-body">{C.pendingNote}</p>
      {!profiles && <div className="text-muted" style={{ fontSize: 13 }}>{C.loading}</div>}
      {profiles && profiles.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{C.nothingPending}</div>}
      {profiles?.map((p) => (
        <div key={p.roleId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.userName ?? p.userEmail ?? "—"} · {p.role}</div>
            <div style={{ fontSize: 11 }} className="text-muted">{p.kind} · {p.status}</div>
          </div>
          <button type="button" className="btn btn-secondary" disabled={activatingId === p.roleId} onClick={() => void handleActivate(p.roleId)}>
            {activatingId === p.roleId ? C.activating : C.activate}
          </button>
        </div>
      ))}
      {message && <div className="tag tag-neutral" style={{ alignSelf: "flex-start" }}>{message}</div>}
    </div>
  );
}

// Phase 6 (supabase/migrations/0021): cross-user oversight of the App/
// domains added in 0018-0020. Expense reports carry the one mutation
// (approve/reject, password-gated); everything else is read-only.
const EXPENSE_STATUS_TAG: Record<string, string> = { pending: "tag-neutral", approved: "tag-success", rejected: "tag-danger" };

function ExpenseReportsSection({ D }: { D: Desk }) {
  const C = D.config;
  const [reports, setReports] = useState<AdminExpenseReport[] | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => void adminListExpenseReports().then(setReports).catch(() => setReports([]));
  useEffect(load, []);

  const handleResolve = async (reportId: string) => {
    if (!password) return;
    setSaving(true);
    setMessage(null);
    try {
      await adminResolveExpenseReport({ reportId, status: decision, password });
      setMessage(C.expenseResolved);
      setActingId(null);
      setPassword("");
      load();
    } catch {
      setMessage(C.expenseFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
      <div className="card-title">{C.expensesTitle}</div>
      <p className="card-body">{C.expensesNote}</p>
      {!reports && <div className="text-muted" style={{ fontSize: 13 }}>{C.loading}</div>}
      {reports && reports.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{C.nothingExpenses}</div>}
      {reports?.map((r) => (
        <div key={r.id} style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title} · {r.userName ?? r.userEmail ?? "—"}</div>
              <div style={{ fontSize: 11 }} className="text-muted">
                {r.currency} {r.amount.toLocaleString()} · {r.category}{r.project ? ` · ${r.project}` : ""} · {new Date(r.submittedAt).toLocaleDateString()}
              </div>
            </div>
            {r.status === "pending" ? (
              <button type="button" className="btn btn-ghost" onClick={() => setActingId(actingId === r.id ? null : r.id)}>
                {actingId === r.id ? C.cancel : C.resolve}
              </button>
            ) : (
              <span className={`tag ${EXPENSE_STATUS_TAG[r.status] ?? "tag-neutral"}`}>{r.status}</span>
            )}
          </div>
          {actingId === r.id && (
            <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
              <select value={decision} onChange={(e) => setDecision(e.target.value as "approved" | "rejected")} className="input" style={{ width: "auto" }}>
                <option value="approved">{C.approve}</option>
                <option value="rejected">{C.reject}</option>
              </select>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={C.passwordLabel} className="input" style={{ width: 160 }} />
              <button type="button" className="btn btn-primary" disabled={saving || !password} onClick={() => void handleResolve(r.id)}>
                {saving ? C.saving : C.confirm}
              </button>
            </div>
          )}
        </div>
      ))}
      {message && <div className="tag tag-neutral" style={{ alignSelf: "flex-start" }}>{message}</div>}
    </div>
  );
}

function ReadOnlyListSection<T>({ title, note, emptyText, loadingText, load, keyOf, render }: {
  title: string; note: string; emptyText: string; loadingText: string;
  load: () => Promise<T[]>; keyOf: (row: T) => string; render: (row: T) => { primary: string; secondary: string };
}) {
  const [rows, setRows] = useState<T[] | null>(null);
  useEffect(() => { void load().then(setRows).catch(() => setRows([])); }, [load]);

  return (
    <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
      <div className="card-title">{title}</div>
      <p className="card-body">{note}</p>
      {!rows && <div className="text-muted" style={{ fontSize: 13 }}>{loadingText}</div>}
      {rows && rows.length === 0 && <div className="text-muted" style={{ fontSize: 13 }}>{emptyText}</div>}
      {rows?.map((row) => {
        const { primary, secondary } = render(row);
        return (
          <div key={keyOf(row)} style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: "var(--space-2)" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{primary}</div>
            <div style={{ fontSize: 11 }} className="text-muted">{secondary}</div>
          </div>
        );
      })}
    </div>
  );
}

const who = (name: string | null, email: string | null) => name ?? email ?? "—";

export function Config({
  D,
  locale,
  setLocale,
  onBack,
  onLogoClick,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onBack: () => void;
  onLogoClick: () => void;
}) {
  const C = D.config;
  const [current, setCurrent] = useState<FxMarginConfig | null>(null);
  const [lastRateUpdate, setLastRateUpdate] = useState<FxRateUpdate | null>(null);
  const [marginPct, setMarginPct] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [note, setNote] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void getCurrentFxMarginConfig().then(setCurrent).catch(() => setCurrent(null));
    void getLastFxRateUpdate().then(setLastRateUpdate).catch(() => setLastRateUpdate(null));
  }, []);

  const marginValue = marginPct.trim() ? Number(marginPct) / 100 : current?.marginRate;
  const commissionValue = commissionPct.trim() ? Number(commissionPct) / 100 : current?.commissionRate;

  const handleSave = async () => {
    if (marginValue == null || commissionValue == null || !password) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateFxMarginConfig({ marginRate: marginValue, commissionRate: commissionValue, decider: "treasury", note: note.trim() || undefined, password });
      setCurrent(updated);
      setMessage(C.saved);
      setMarginPct("");
      setCommissionPct("");
      setNote("");
      setPassword("");
    } catch {
      setMessage(C.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const result = await refreshLiveFxRates();
      if (result.error) {
        setMessage(C.refreshFailed.replace("%1", result.error));
      } else {
        setMessage(C.refreshed.replace("%1", String(result.updated)).replace("%2", result.source));
        void getLastFxRateUpdate().then(setLastRateUpdate);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />
        </div>
        <div className="pr-ids">
          <LocaleMenu value={locale} onChange={setLocale} variant="console" />
          <BackButton label={D.back} onClick={onBack} />
        </div>
      </div>

      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 720, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{C.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{C.subtitle}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
            <div className="card-title">{C.marginTitle}</div>
            <p className="card-body">{C.marginNote}</p>

            {current && (
              <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }} className="text-muted">{C.currentMargin}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{(current.marginRate * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }} className="text-muted">{C.currentCommission}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{(current.commissionRate * 100).toFixed(1)}%</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" }} className="text-muted">{C.setBy}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{current.decider}</div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <div className="field">
                <label>{C.newMarginLabel}</label>
                <input type="number" step="0.1" min="0" max="99" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} placeholder={current ? (current.marginRate * 100).toFixed(1) : "30"} className="input" />
              </div>
              <div className="field">
                <label>{C.newCommissionLabel}</label>
                <input type="number" step="0.1" min="0" max="99" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} placeholder={current ? (current.commissionRate * 100).toFixed(1) : "3.5"} className="input" />
              </div>
            </div>
            <div className="field">
              <label>{C.noteLabel}</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={C.notePlaceholder} className="input" />
            </div>
            <div className="field">
              <label>{C.passwordLabel}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
            </div>
            <button type="button" className="btn btn-primary" style={{ alignSelf: "flex-start" }} disabled={saving || !password} onClick={() => void handleSave()}>
              {saving ? C.saving : C.save}
            </button>
          </div>

          <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
            <div className="card-title">{C.liveRatesTitle}</div>
            <p className="card-body">{C.liveRatesNote}</p>
            {lastRateUpdate && (
              <div style={{ fontSize: 12 }} className="text-muted">
                {C.lastUpdated.replace("%1", new Date(lastRateUpdate.fetchedAt).toLocaleString()).replace("%2", String(lastRateUpdate.currenciesUpdated)).replace("%3", lastRateUpdate.source)}
              </div>
            )}
            <button type="button" className="btn btn-secondary" style={{ alignSelf: "flex-start" }} disabled={refreshing} onClick={() => void handleRefresh()}>
              {refreshing ? C.refreshing : C.refreshNow}
            </button>
            <div style={{ fontSize: 10 }} className="text-muted">{C.attribution}</div>
          </div>

          {message && <div className="tag tag-neutral" style={{ alignSelf: "flex-start" }}>{message}</div>}

          <BlockedTransfersSection D={D} />
          <PendingProfilesSection D={D} />
          <ExpenseReportsSection D={D} />
          <ReadOnlyListSection
            title={C.cardsTitle} note={C.cardsNote} emptyText={C.nothingCards} loadingText={C.loading}
            load={adminListCorporateCards} keyOf={(c) => c.id}
            render={(c) => ({
              primary: `${c.holderName} · ${c.role}`,
              secondary: `${c.currency} ${c.spentAmount.toLocaleString()} / ${c.limitAmount.toLocaleString()} · ${who(c.ownerName, c.ownerEmail)}`,
            })}
          />
          <ReadOnlyListSection
            title={C.loyaltyTitle} note={C.loyaltyNote} emptyText={C.nothingLoyalty} loadingText={C.loading}
            load={adminListLoyaltyAccounts} keyOf={(a) => a.id}
            render={(a) => ({
              primary: `${a.venueName} · ${who(a.userName, a.userEmail)}`,
              secondary: `${a.points.toLocaleString()} pts · ${a.currency} ${a.monthlySpend.toLocaleString()} this month · ${a.cashbackRate}% cashback`,
            })}
          />
          <ReadOnlyListSection
            title={C.betsTitle} note={C.betsNote} emptyText={C.nothingBets} loadingText={C.loading}
            load={adminListGameBets} keyOf={(b) => b.id}
            render={(b) => ({
              primary: `${b.kind} · ${who(b.userName, b.userEmail)}`,
              secondary: `${b.currency} ${b.stakeAmount.toLocaleString()} stake · ${b.status}${b.payoutAmount != null ? ` · payout ${b.payoutAmount.toLocaleString()}` : ""} · ${new Date(b.placedAt).toLocaleString()}`,
            })}
          />
          <ReadOnlyListSection
            title={C.tontineTitle} note={C.tontineNote} emptyText={C.nothingTontine} loadingText={C.loading}
            load={adminListTontineMembers} keyOf={(m) => `${m.circleId}-${m.memberPosition}`}
            render={(m) => ({
              primary: `${m.circleName} · #${m.memberPosition}`,
              secondary: `${who(m.userName, m.userEmail)} · ${new Date(m.joinedAt).toLocaleDateString()}`,
            })}
          />
          <ReadOnlyListSection
            title={C.pitchesTitle} note={C.pitchesNote} emptyText={C.nothingPitches} loadingText={C.loading}
            load={adminListPitchSubmissions} keyOf={(p) => p.id}
            render={(p) => ({
              primary: `${p.title} · ${who(p.ownerName, p.ownerEmail)}`,
              secondary: `${p.category ?? "—"} · ${p.currency} ${p.raised.toLocaleString()} / ${p.goal.toLocaleString()} · ${p.risk} risk · ${new Date(p.createdAt).toLocaleDateString()}`,
            })}
          />
        </div>
      </div>
    </div>
  );
}
