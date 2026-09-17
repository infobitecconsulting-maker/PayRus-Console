import { useEffect, useState } from "react";
import type { Desk, LedgerRow, Locale, Role, TabKey } from "../types.ts";
import { TAB_KEYS, fmtNum } from "../data.ts";
import { fetchConsoleData, type ConsoleData } from "../lib/backend.ts";
import { BackButton, BarChart, FxTable, KpiTile, LedgerTable, LocaleMenu, PayRusLogo, PositionCard, QueueCard, SegGroup } from "../components/parts.tsx";

const STATE_KEYS = ["All", "Settled", "Pending", "Failed"] as const;

export function Console({
  D,
  locale,
  setLocale,
  profile,
  tabIx,
  setTabIx,
  rangeIx,
  setRangeIx,
  filterIx,
  setFilterIx,
  onBack,
  onSwitchProfile,
  onSignOut,
  onLogoClick,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  profile: Role;
  tabIx: number;
  setTabIx: (i: number) => void;
  rangeIx: number;
  setRangeIx: (i: number) => void;
  filterIx: number;
  setFilterIx: (i: number) => void;
  onBack: () => void;
  onSwitchProfile: () => void;
  onSignOut: () => void;
  onLogoClick: () => void;
}) {
  const [data, setData] = useState<ConsoleData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchConsoleData()
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err: unknown) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err)); });
    return () => { cancelled = true; };
  }, []);

  if (loadError) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "var(--space-8)" }}>
        <div className="tag tag-accent">Couldn't load console data: {loadError}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "var(--space-8)" }}>
        <div className="tag tag-neutral">Loading…</div>
      </div>
    );
  }

  const roleIx = data.roleOrder.indexOf(profile);
  const scope = data.roleScope[profile] ?? { sees: [], kpis: [], bars: [] };
  const pos = data.positions[profile];
  const caps = data.caps[profile] ?? [];
  const tabKey = TAB_KEYS[tabIx];
  const isOverview = tabKey === "overview";
  const kpiText = D.kpiText[profile];

  const views: Record<TabKey, { headline: string | null; caption: string | null; ranged: boolean; cols: string[]; rows: LedgerRow[]; limit?: number }> = {
    overview: { headline: null, caption: D.tableTitles[roleIx] || D.tableTitle, ranged: true, cols: D.cols, rows: data.viewRows.overview, limit: 8 },
    transactions: { headline: D.ledger, caption: null, ranged: false, cols: D.cols, rows: data.viewRows.transactions },
    payouts: { headline: D.batches, caption: null, ranged: false, cols: D.colsPayouts, rows: data.viewRows.payouts },
    merchants: { headline: D.merchantRoster, caption: null, ranged: false, cols: D.colsMerchants, rows: data.viewRows.merchants },
    agents: { headline: D.agentRoster, caption: null, ranged: false, cols: D.colsAgents, rows: data.viewRows.agents },
    mandates: { headline: D.mandateRoster, caption: null, ranged: false, cols: D.colsMandates, rows: data.viewRows.mandates },
    grants: { headline: D.grantRoster, caption: null, ranged: false, cols: D.colsGrants, rows: data.viewRows.grants },
    members: { headline: D.memberRoster, caption: null, ranged: false, cols: D.colsMembers, rows: data.viewRows.members },
  };
  const view = views[tabKey];

  const activeState = STATE_KEYS[filterIx];
  const scale = data.rangeScale[rangeIx] ?? 1;
  const mine = (r: LedgerRow) => !r.who || scope.sees.includes(r.who);
  const scoped = view.rows.filter(mine).slice(0, view.limit ?? Infinity);
  const rows = scoped.filter((r) => activeState === "All" || r.state === activeState);
  const queueItems = data.queue.filter((q) => q.roles.includes(profile));

  function goTab(i: number) {
    if (!caps.includes(TAB_KEYS[i])) return;
    setTabIx(i);
    setFilterIx(0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />
        </div>
        <div className="pr-tabs">
          {D.tabs.map((label, i) => {
            const ok = caps.includes(TAB_KEYS[i]);
            return (
              <button
                key={label}
                type="button"
                className={`btn ${i === tabIx ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={i === tabIx}
                disabled={!ok}
                title={ok ? "" : D.locked}
                onClick={() => goTab(i)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="pr-ids">
          <LocaleMenu value={locale} onChange={setLocale} variant="console" />
          <span className="tag tag-neutral" style={{ whiteSpace: "nowrap" }}>
            {D.pilotClient}
          </span>
          <span className="tag tag-accent-2" style={{ whiteSpace: "nowrap" }}>
            {D.pilotBadge}
          </span>
          <span className="tag tag-outline" style={{ whiteSpace: "nowrap" }}>
            {profile}
          </span>
          <BackButton label={D.back} onClick={onBack} />
          <button type="button" className="btn btn-ghost" onClick={onSwitchProfile}>
            {D.switchProfile}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSignOut}>
            {D.signOut}
          </button>
        </div>
      </div>

      <div className="pr-shell" style={{ flex: 1, padding: "var(--space-6) var(--space-6) var(--space-8)", maxWidth: 1560, width: "100%", boxSizing: "border-box" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-neutral-600)" }}>
                {D.tabs[tabIx]}
                {view.ranged ? " · " + D.ranges[rangeIx].toLowerCase() : ""}
              </div>
              <h1 style={{ margin: "6px 0 0" }}>{view.headline || D.roleHeadlines[roleIx] || D.title}</h1>
            </div>
            {view.ranged && (
              <SegGroup label="Range" value={rangeIx} onChange={setRangeIx} options={D.ranges.map((label, i) => ({ value: i, label }))} />
            )}
          </div>

          {isOverview && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "var(--space-6)", marginTop: "var(--space-6)" }}>
              {scope.kpis.map((k, ix) => {
                const kt = kpiText[ix];
                const value = kt.text != null ? kt.text : fmtNum(k.flow ? k.n! * scale : k.n!, k.dec ?? 0, locale) + (k.suffix || "");
                let delta = kt.note;
                (k.noteNums || []).forEach((num, j) => {
                  delta = delta.replace("%" + (j + 1), fmtNum(num.flow ? num.v * scale : num.v, 0, locale));
                });
                return <KpiTile key={kt.label} label={kt.label} value={value} delta={delta} accent={ix === 0} />;
              })}
            </div>
          )}

          {isOverview && scope.bars.length > 0 && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{D.chartTitles[roleIx] || D.chartTitle}</h3>
                <div style={{ fontSize: 13, color: "var(--color-neutral-600)" }}>
                  {D.chartNote} {D.ranges[rangeIx].toLowerCase()}
                </div>
              </div>
              {(() => {
                const data = scope.bars.filter(([, eur]) => eur > 0).map(([label, eur]) => ({ label, eur: eur * scale }));
                const max = Math.max(...data.map((x) => x.eur), 1);
                const bars = data.map((x, i) => ({
                  label: x.label,
                  h: ((x.eur / max) * 100).toFixed(1) + "%",
                  fill: i === 0 ? "var(--color-accent-2-500)" : "var(--color-accent-500)",
                  value: x.eur >= 1000 ? (x.eur / 1000).toFixed(1) + "k" : Math.round(x.eur) + "",
                }));
                return <BarChart bars={bars} />;
              })()}
            </div>
          )}

          <div style={{ marginTop: "var(--space-8)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
              {view.caption && <h3 style={{ margin: 0 }}>{view.caption}</h3>}
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                {D.filters.map((f, i) => {
                  const key = STATE_KEYS[i];
                  const count = key === "All" ? scoped.length : scoped.filter((r) => r.state === key).length;
                  const ok = count > 0;
                  return (
                    <button
                      key={f}
                      type="button"
                      className={`btn ${i === filterIx ? "btn-primary" : "btn-ghost"}`}
                      aria-pressed={i === filterIx}
                      disabled={!ok}
                      onClick={() => ok && setFilterIx(i)}
                    >
                      {f} · {count}
                    </button>
                  );
                })}
              </div>
            </div>
            <LedgerTable
              cols={view.cols.map((label, i) => ({ label, align: i >= 3 ? "right" : "left" }))}
              rows={rows}
              states={D.states}
              emptyText={D.emptyRows}
            />
          </div>
        </div>

        <div className="pr-side" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          {pos && (
            <PositionCard
              title={D.positionTitles[roleIx] || D.position}
              total={pos.total}
              pockets={pos.pockets}
              note={D.positionNotes[roleIx] || D.positionNote}
            />
          )}
          {queueItems.length > 0 && (
            <div>
              <h4 style={{ margin: "0 0 var(--space-4)" }}>{D.queueTitle}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {queueItems.map((q) => (
                  <QueueCard key={q.i} item={{ ...D.queueText[q.i], cls: q.cls }} />
                ))}
              </div>
            </div>
          )}
          <FxTable title={D.fxTitle} rows={data.fx.map((f, i) => ({ ...f, note: D.fxNotes[i] }))} />
        </div>
      </div>
    </div>
  );
}
