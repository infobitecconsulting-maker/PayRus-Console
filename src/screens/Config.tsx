import { useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import {
  getCurrentFxMarginConfig, updateFxMarginConfig, type FxMarginConfig,
  getLastFxRateUpdate, refreshLiveFxRates, type FxRateUpdate,
  adminListBlockedTransfers, adminResolveTransfer, type BlockedTransfer,
  adminListPendingProfiles, adminActivateProfile, type PendingProfile,
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
        </div>
      </div>
    </div>
  );
}
