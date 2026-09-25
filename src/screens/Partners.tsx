import { useCallback, useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { getMyPermissions } from "../lib/adminStaff.ts";
import {
  contractReadiness, contractTerms, listPriorities, setPriority, draftOfferWithAi, importOffer, integrationTasks, listContracts, listPolicies, recordPrefund, setAdapter,
  setContractStatus, setIntegrationStep, setPolicy, setTermActivation, simulatePricing,
  type ContractRow, type IntegrationTask, type PolicyRow, type ReadinessRow, type SimRow, type TermRow,
} from "../lib/partners.ts";
import { PayoutTypesTab } from "./PayoutTypes.tsx";

type Tab = "contracts" | "pricing" | "types" | "import";
const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const STATUS_CHIP: Record<string, ReturnType<typeof chip>> = {
  draft: chip("#F1F4F7", "#4A5A6A"), due_diligence: chip("#FFF1D6", "#8A5A00"), signed: chip("#E7EEF7", "#1D3F6B"),
  active: chip("#DDF3E8", "#1B6B45"), suspended: chip("#FBE0E4", "#A3243B"), terminated: chip("#F1F4F7", "#4A5A6A"),
};
const SEV: Record<string, ReturnType<typeof chip>> = { blocker: chip("#A3243B", "#fff"), warning: chip("#FFF1D6", "#8A5A00"), ok: chip("#DDF3E8", "#1B6B45") };
const NEXT: Record<string, string[]> = {
  draft: ["due_diligence"], due_diligence: ["signed", "draft"], signed: ["active"], active: ["suspended"], suspended: ["active"], terminated: [],
};
const ADAPTERS = ["manual", "simulated", "onafriq_hub", "cinetpay_api", "belmoney_api", "generic_api"];
const METHODS = ["mobile_money", "bank", "cash_pickup"];
const OBJECTIVES = ["balanced", "cheapest", "fastest"];
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : "Error");
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;
const n2 = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const pct = (n: number | null | undefined) => (n == null ? "—" : `${(Number(n) * 100).toLocaleString(undefined, { maximumFractionDigits: 3 })}%`);

export function Partners({ D, locale, setLocale, onBack, onLogoClick }: { D: Desk; locale: Locale; setLocale: (l: Locale) => void; onBack: () => void; onLogoClick: () => void }) {
  const P = D.partnersPage;
  const [tab, setTab] = useState<Tab>("contracts");
  const [isSuper, setIsSuper] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { void getMyPermissions().then((p) => setIsSuper(p.isSuperadmin)).catch(() => setIsSuper(false)); }, []);
  const tabBtn = (id: Tab, label: string) => <button key={id} type="button" className={tab === id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setTab(id)}>{label}</button>;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="nav">
        <div className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 9 }}><PayRusLogo onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} /></div>
        <div className="pr-ids"><LocaleMenu value={locale} onChange={setLocale} variant="console" /><BackButton label={D.back} onClick={onBack} /></div>
      </div>
      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 1040, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{P.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{P.subtitle}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-3)" }}>{tabBtn("contracts", P.tabContracts)}{tabBtn("pricing", P.tabPricing)}{tabBtn("types", "Payout types")}{tabBtn("import", P.tabImport)}</div>
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}
        {tab === "contracts" && <ContractsTab P={P} notify={setMessage} />}
        {tab === "pricing" && <PricingTab P={P} isSuper={isSuper} notify={setMessage} />}
        {tab === "types" && <PayoutTypesTab isSuper={isSuper} notify={setMessage} />}
        {tab === "import" && <ImportTab P={P} notify={setMessage} onDone={() => setTab("contracts")} />}
      </div>
    </div>
  );
}

type Copy = Desk["partnersPage"];

function ContractsTab({ P, notify }: { P: Copy; notify: (m: string) => void }) {
  const [rows, setRows] = useState<ContractRow[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const load = useCallback(() => { listContracts().then(setRows).catch((e) => notify(errText(e))); }, [notify]);
  useEffect(load, [load]);
  const current = rows?.find((r) => r.contractId === sel) ?? null;
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {rows === null && <div className="tag tag-neutral">{P.loading}</div>}
      {rows?.length === 0 && <div className="text-muted">{P.none}</div>}
      {(rows ?? []).map((c) => (
        <button key={c.contractId} type="button" className="card elev-sm" style={{ textAlign: "left", cursor: "pointer", gap: 4, outline: sel === c.contractId ? "2px solid var(--color-primary, #1D3F6B)" : "none" }} onClick={() => setSel(c.contractId)}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{c.partnerName} <span className="text-muted" style={{ fontWeight: 400 }}>· {c.reference}</span></strong>
            <span style={{ display: "flex", gap: 6 }}><span style={STATUS_CHIP[c.status]}>{c.status.replace("_", " ")}</span><span style={c.live ? chip("#DDF3E8", "#1B6B45") : chip("#F1F4F7", "#4A5A6A")}>{c.live ? P.live : P.notLive}</span></span>
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>{c.terms} {P.termsLabel} · {c.agents} {P.agentsLabel} · {c.countries.join(", ")} · {P.integration}: {c.integrationAdapter} / {c.integrationStatus.replace("_", " ")} · {P.prefundShort}: {n2(c.prefundBalance)} {c.settlementCurrency}{c.queuedRequests > 0 ? ` · ${c.queuedRequests} ${P.queueLabel}` : ""}</span>
        </button>
      ))}
      {current && <ContractDetail P={P} c={current} notify={notify} reload={load} />}
    </div>
  );
}

function ContractDetail({ P, c, notify, reload }: { P: Copy; c: ContractRow; notify: (m: string) => void; reload: () => void }) {
  const [ready, setReady] = useState<ReadinessRow[] | null>(null);
  const [tasks, setTasks] = useState<IntegrationTask[]>([]);
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [amount, setAmount] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [prio, setPrio] = useState<string>("");
  useEffect(() => { void getMyPermissions().then((p) => setIsSuper(p.isSuperadmin)).catch(() => setIsSuper(false)); }, []);
  const refresh = useCallback(() => {
    void contractReadiness(c.contractId).then(setReady).catch((e) => notify(errText(e)));
    void integrationTasks(c.contractId).then(setTasks).catch(() => undefined);
    void contractTerms(c.contractId).then(setTerms).catch(() => undefined);
    void listPriorities().then((m) => setPrio(String(m[c.contractId] ?? ""))).catch(() => undefined);
  }, [c.contractId, notify]);
  useEffect(refresh, [refresh]);
  const run = (fn: () => Promise<unknown>) => { fn().then(() => { notify(P.saved); refresh(); reload(); }).catch((e) => notify(errText(e))); };
  const move = (to: string) => {
    let reason: string | undefined;
    if (["suspended", "draft", "terminated"].includes(to)) { const r = window.prompt(P.reasonPrompt); if (r === null) return; reason = r; }
    run(() => setContractStatus(c.contractId, to, reason));
  };
  return (
    <div className="card elev-sm" style={{ gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div className="card-title">{c.partnerName} · {c.reference}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(NEXT[c.status] ?? []).map((s) => <button key={s} type="button" className="btn btn-ghost" onClick={() => move(s)}>{P.moveTo} {s.replace("_", " ")}</button>)}
          {c.status !== "terminated" && <button type="button" className="btn btn-ghost" onClick={() => move("terminated")}>{P.moveTo} terminated</button>}
        </div>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 13 }}>{P.readinessTitle}</strong>
        {(ready ?? []).map((r, i) => <div key={i} style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={SEV[r.severity]}>{r.severity === "blocker" ? P.blockerLabel : r.severity === "warning" ? P.warningLabel : P.okLabel}</span><span>{r.message}</span></div>)}
      </div>

      <div style={{ ...hr, paddingTop: 8, display: "grid", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <strong style={{ fontSize: 13 }}>{P.checklistTitle}</strong>
          <label style={{ fontSize: 12 }}>{P.adapterLabel}{" "}
            <select className="input" value={c.integrationAdapter} onChange={(e) => run(() => setAdapter(c.contractId, e.target.value))}>{ADAPTERS.map((a) => <option key={a} value={a}>{a}</option>)}</select>
          </label>
          <span className="text-muted" style={{ fontSize: 12 }}>{c.integrationStatus.replace("_", " ")}</span>
        </div>
        {tasks.map((t) => (
          <label key={t.step} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={t.done} onChange={(e) => run(() => setIntegrationStep(c.contractId, t.step, e.target.checked))} />{t.label}
          </label>
        ))}
      </div>

      <div style={{ ...hr, paddingTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>Routing priority (1 = first)</strong>
        <input className="input" style={{ width: 90 }} type="number" min={1} max={1000} disabled={!isSuper} aria-label="Routing priority" value={prio} onChange={(e) => setPrio(e.target.value)} />
        <button type="button" className="btn btn-ghost" disabled={!isSuper || !Number(prio)} onClick={() => { const r = window.prompt(P.reasonPrompt); if (r === null) return; run(() => setPriority(c.contractId, Number(prio), r)); }}>Save priority</button>
        <span className="text-muted" style={{ fontSize: 12 }}>Lower numbers are used first on a corridor; the pricing objective picks between equals.</span>
      </div>
      <div style={{ ...hr, paddingTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>{P.prefundTitle}: {n2(c.prefundBalance)} {c.settlementCurrency}</strong>
        <input className="input" style={{ width: 130 }} inputMode="decimal" aria-label={P.prefundAmount} placeholder={P.prefundAmount} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="button" className="btn btn-ghost" disabled={!Number(amount)} onClick={() => run(async () => { await recordPrefund(c.contractId, Number(amount), "console"); setAmount(""); })}>{P.record}</button>
      </div>

      <div style={{ ...hr, paddingTop: 8, overflowX: "auto" }}>
        <strong style={{ fontSize: 13 }}>{P.termsTitle} ({terms.length})</strong>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", marginTop: 6 }}>
          <thead><tr style={{ textAlign: "left" }}>{["", "country", "method", "provider", "flat", "%", "basis", "payout ccy", "delivery", "status", ""].map((h, i) => <th key={i} style={{ padding: 4 }}>{h}</th>)}</tr></thead>
          <tbody>
            {terms.map((t, i) => (
              <tr key={i} style={hr}>
                <td style={{ padding: 4 }}>{t.direction === "payin" ? "in" : "out"}</td><td style={{ padding: 4 }}>{t.country}</td><td style={{ padding: 4 }}>{t.method}</td><td style={{ padding: 4 }}>{t.provider ?? "—"}</td>
                <td style={{ padding: 4 }}>{n2(t.flatFee)} {t.feeCurrency}</td><td style={{ padding: 4 }}>{pct(t.commissionPercent)}</td><td style={{ padding: 4 }}>{t.commissionBasis === "gross_margin" ? "margin" : "principal"}</td>
                <td style={{ padding: 4 }}>{t.payoutCurrency ?? "—"}</td><td style={{ padding: 4 }}>{t.deliveryTime?.replace(/_/g, " ") ?? "—"}</td><td style={{ padding: 4 }}>{t.direction === "payout" ? t.activation : "—"}</td>
                <td style={{ padding: 4 }}>{t.direction === "payout" && (t.activation === "approved"
                  ? <button type="button" className="btn btn-ghost" onClick={() => run(() => setTermActivation(c.contractId, t, "suspended"))}>{P.suspendTerm}</button>
                  : <button type="button" className="btn btn-ghost" onClick={() => run(() => setTermActivation(c.contractId, t, "approved"))}>{P.approve}</button>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const emptyPolicy = (): Omit<PolicyRow, "id" | "active"> => ({
  scope: "global", country: null, method: null, objective: "balanced", marginFlatEur: 0.5, marginPercent: 0.005, minFeeEur: 0.99, maxFeeEur: null,
  premiumFastEur: 0.2, premiumSameDayEur: 0.1, slaWeightEurPerDay: 0.3, fallbackCostEur: 1.5, roundingStep: 0.05,
});

function PricingTab({ P, isSuper, notify }: { P: Copy; isSuper: boolean; notify: (m: string) => void }) {
  const [policies, setPolicies] = useState<PolicyRow[] | null>(null);
  const [form, setForm] = useState(emptyPolicy());
  const [sim, setSim] = useState<{ country: string; method: string; amount: string; rows: SimRow[] | null }>({ country: "CD", method: "mobile_money", amount: "100", rows: null });
  const load = useCallback(() => { listPolicies().then(setPolicies).catch((e) => notify(errText(e))); }, [notify]);
  useEffect(load, [load]);
  const num = (k: keyof typeof form, label: string, step = "0.01") => (
    <div className="field"><label htmlFor={`pp-${k}`}>{label}</label>
      <input id={`pp-${k}`} className="input" type="number" step={step} disabled={!isSuper} value={form[k] == null ? "" : String(form[k])}
        onChange={(e) => setForm({ ...form, [k]: e.target.value === "" ? null : Number(e.target.value) })} /></div>
  );
  const save = () => {
    const reason = window.prompt(P.reasonPrompt); if (reason === null) return;
    setPolicy({ ...form, country: form.scope.includes("country") ? form.country : null, method: form.scope.includes("method") || form.scope === "country_method" ? form.method : null }, reason)
      .then(() => { notify(P.saved); load(); }).catch((e) => notify(errText(e)));
  };
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="card elev-sm" style={{ gap: 8 }}>
        <div className="card-title">{P.policyTitle}</div>
        <div className="text-muted" style={{ fontSize: 12 }}>{P.policyHint}</div>
        {!isSuper && <div className="tag tag-neutral">{P.superadminOnly}</div>}
        {policies === null && <div className="tag tag-neutral">{P.loading}</div>}
        {(policies ?? []).map((p) => (
          <button key={p.id} type="button" style={{ ...hr, textAlign: "left", background: "transparent", cursor: "pointer", padding: "6px 0", fontSize: 12 }} onClick={() => setForm({ ...p })}>
            <strong>{p.scope}{p.country ? ` ${p.country}` : ""}{p.method ? ` ${p.method}` : ""}</strong> · {p.objective} · margin {n2(p.marginFlatEur)} EUR + {pct(p.marginPercent)} · min {n2(p.minFeeEur)}{p.maxFeeEur ? ` / max ${n2(p.maxFeeEur)}` : ""} · fast +{n2(p.premiumFastEur)} · same-day +{n2(p.premiumSameDayEur)} · SLA weight {n2(p.slaWeightEurPerDay)}/day · fallback {n2(p.fallbackCostEur)}
          </button>
        ))}
        <div style={{ ...hr, paddingTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
          <div className="field"><label htmlFor="pp-scope">scope</label>
            <select id="pp-scope" className="input" disabled={!isSuper} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>{["global", "country", "method", "country_method"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="field"><label htmlFor="pp-country">{P.country}</label><input id="pp-country" className="input" maxLength={2} disabled={!isSuper || !form.scope.includes("country")} value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} /></div>
          <div className="field"><label htmlFor="pp-method">{P.method}</label>
            <select id="pp-method" className="input" disabled={!isSuper || !form.scope.includes("method")} value={form.method ?? ""} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="">—</option>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="field"><label htmlFor="pp-obj">objective</label>
            <select id="pp-obj" className="input" disabled={!isSuper} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}>{OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
          {num("marginFlatEur", "margin flat (EUR)")}{num("marginPercent", "margin % (0.005 = 0.5%)", "0.001")}{num("minFeeEur", "min fee (EUR)")}{num("maxFeeEur", "max fee (EUR)")}
          {num("premiumFastEur", "fast premium (EUR)")}{num("premiumSameDayEur", "same-day premium (EUR)")}{num("slaWeightEurPerDay", "SLA weight (EUR/day)")}{num("fallbackCostEur", "fallback cost (EUR)")}{num("roundingStep", "rounding step")}
        </div>
        <div><button type="button" className="btn btn-primary" disabled={!isSuper} onClick={save}>{P.save}</button></div>
      </div>

      <div className="card elev-sm" style={{ gap: 8 }}>
        <div className="card-title">{P.simulatorTitle}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field"><label htmlFor="sim-c">{P.country}</label><input id="sim-c" className="input" style={{ width: 70 }} maxLength={2} value={sim.country} onChange={(e) => setSim({ ...sim, country: e.target.value.toUpperCase() })} /></div>
          <div className="field"><label htmlFor="sim-m">{P.method}</label><select id="sim-m" className="input" value={sim.method} onChange={(e) => setSim({ ...sim, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="field"><label htmlFor="sim-a">{P.amountUsd}</label><input id="sim-a" className="input" style={{ width: 100 }} inputMode="decimal" value={sim.amount} onChange={(e) => setSim({ ...sim, amount: e.target.value })} /></div>
          <button type="button" className="btn btn-primary" onClick={() => simulatePricing(sim.country, sim.method, Number(sim.amount) || 100).then((rows) => setSim((s) => ({ ...s, rows }))).catch((e) => notify(errText(e)))}>{P.simulate}</button>
        </div>
        {sim.rows && (
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left" }}>{["partner", "contract", "source", "delivery", P.costLabel, P.feeLabel, "score", ""].map((h, i) => <th key={i} style={{ padding: 4 }}>{h}</th>)}</tr></thead>
            <tbody>{sim.rows.map((r, i) => (
              <tr key={i} style={{ ...hr, background: r.chosen ? "#E7F3EC" : undefined }}>
                <td style={{ padding: 4 }}>{r.partnerName}{r.provider ? ` · ${r.provider}` : ""}</td><td style={{ padding: 4 }}>{r.contractReference ?? "—"} {r.contractStatus ? `(${r.contractStatus})` : ""}</td><td style={{ padding: 4 }}>{r.source}{r.overridden ? " · fixed" : ""}</td>
                <td style={{ padding: 4 }}>{r.deliveryTime?.replace(/_/g, " ") ?? "—"}</td><td style={{ padding: 4 }}>{n2(r.costEur)}</td><td style={{ padding: 4 }}><strong>{n2(r.feeEur)}</strong></td><td style={{ padding: 4 }}>{n2(r.score)}</td>
                <td style={{ padding: 4 }}>{r.chosen ? <span style={chip("#DDF3E8", "#1B6B45")}>{P.chosenTag}</span> : ""}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ImportTab({ P, notify, onDone }: { P: Copy; notify: (m: string) => void; onDone: () => void }) {
  const [text, setText] = useState("");
  const [json, setJson] = useState("");
  const [amb, setAmb] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const draft = async () => {
    setBusy(true); setAmb([]);
    const r = await draftOfferWithAi(text);
    setBusy(false);
    if ("error" in r) { notify(r.error === "not_configured" ? P.aiNotConfigured : r.error === "forbidden" ? P.aiForbidden : P.aiUnavailable); return; }
    setJson(JSON.stringify(r.draft, null, 2)); setAmb(r.ambiguities);
  };
  const doImport = () => {
    let offer: unknown;
    try { offer = JSON.parse(json); } catch { notify("JSON?"); return; }
    setBusy(true);
    importOffer(offer).then((r) => { notify(P.imported.replace("{n}", String(r.termsCreated))); setWarnings(r.warnings); if (r.warnings.length === 0) onDone(); }).catch((e) => notify(errText(e))).finally(() => setBusy(false));
  };
  return (
    <div className="card elev-sm" style={{ gap: 10 }}>
      <div className="text-muted" style={{ fontSize: 13 }}>{P.importIntro}</div>
      <div className="field"><label htmlFor="pi-text">{P.importPaste}</label><textarea id="pi-text" className="input" rows={7} value={text} onChange={(e) => setText(e.target.value)} /></div>
      <div><button type="button" className="btn btn-primary" disabled={busy || text.trim().length < 20} onClick={() => void draft()}>{busy ? P.drafting : P.draftAI}</button></div>
      {amb.length > 0 && <div style={{ display: "grid", gap: 3 }}><strong style={{ fontSize: 13 }}>{P.ambiguitiesTitle}</strong>{amb.map((a, i) => <div key={i} style={{ fontSize: 12 }}>• {a}</div>)}</div>}
      <div className="field"><label htmlFor="pi-json">{P.draftJson}</label><textarea id="pi-json" className="input" rows={12} style={{ fontFamily: "monospace", fontSize: 12 }} value={json} onChange={(e) => setJson(e.target.value)} /></div>
      <div><button type="button" className="btn btn-primary" disabled={busy || json.trim().length < 10} onClick={doImport}>{P.importDraft}</button></div>
      {warnings.length > 0 && <div style={{ display: "grid", gap: 3 }}><strong style={{ fontSize: 13 }}>{P.warningsTitle}</strong>{warnings.map((w, i) => <div key={i} style={{ fontSize: 12 }}>• {w}</div>)}</div>}
    </div>
  );
}
