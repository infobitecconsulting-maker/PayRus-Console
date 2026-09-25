import { useCallback, useEffect, useState } from "react";
import {
  channelTypeReadiness, clearChannelTypeCountry, listChannelTypeCountries, listChannelTypes, setChannelType, setChannelTypeCountry, simulateChannelType,
  type ChannelTypeCountryRow, type ChannelTypeRow, type ChannelTypeSim, type ReadinessRow,
} from "../lib/partners.ts";

// Payout types — PayRus agent, partner distributor, mobile money, bank remittance: their pricing parameters, per-country overrides and onboarding readiness.
const CATEGORIES = ["agent_network", "distribution_partner", "wallet", "bank"];
const METHODS = ["mobile_money", "bank", "cash_pickup"];
const DELIVERY = ["near_real_time", "same_day", "t_plus_1", "t_plus_2"];
const chip = (bg: string, fg: string) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: bg, color: fg } as const);
const SEV: Record<string, ReturnType<typeof chip>> = { blocker: chip("#A3243B", "#fff"), warning: chip("#FFF1D6", "#8A5A00"), ok: chip("#DDF3E8", "#1B6B45") };
const errText = (e: unknown) => (e instanceof Error ? e.message.replace(/^[A-Za-z_]+: /, "") : "Error");
const hr = { borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" } as const;
const n2 = (n: number | null | undefined) => (n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 4 }));
const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

const blankOverride = (code: string): ChannelTypeCountryRow => ({ code, country: "", active: true, ownCostFlatEur: null, ownCostPercent: null, marginFlatEur: null, marginPercent: null, premiumEur: null, minFeeEur: null, maxFeeEur: null, deliveryTime: null });
const blankType = (): ChannelTypeRow => ({
  code: "", label: "", category: "distribution_partner", method: "cash_pickup", agentKind: null, costSource: "partner", active: true, sortOrder: 100, ownCostFlatEur: 0, ownCostPercent: 0,
  marginFlatEur: 0, marginPercent: 0, premiumEur: 0, minFeeEur: null, maxFeeEur: null, deliveryTime: null, onboardingRequirements: [], notes: null, countryOverrides: 0,
});

export function PayoutTypesTab({ isSuper, notify }: { isSuper: boolean; notify: (m: string) => void }) {
  const [types, setTypes] = useState<ChannelTypeRow[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [form, setForm] = useState<ChannelTypeRow | null>(null);
  const [ready, setReady] = useState<ReadinessRow[]>([]);
  const [overrides, setOverrides] = useState<ChannelTypeCountryRow[]>([]);
  const [ov, setOv] = useState<ChannelTypeCountryRow | null>(null);
  const [sim, setSim] = useState<{ country: string; amount: string; rows: ChannelTypeSim[] | null }>({ country: "CD", amount: "100", rows: null });
  const load = useCallback(() => { listChannelTypes().then(setTypes).catch((e) => notify(errText(e))); }, [notify]);
  useEffect(load, [load]);
  useEffect(() => {
    if (!sel) return;
    void channelTypeReadiness(sel).then(setReady).catch(() => setReady([]));
    void listChannelTypeCountries(sel).then(setOverrides).catch(() => setOverrides([]));
  }, [sel, types]);
  const pick = (t: ChannelTypeRow) => { setSel(t.code); setForm({ ...t }); setOv(null); setSim((s) => ({ ...s, rows: null })); };
  const ask = () => window.prompt("Written reason (5+ characters):");
  const save = () => {
    if (!form) return; const reason = ask(); if (reason === null) return;
    setChannelType(form, reason).then(() => { notify("Saved"); setSel(form.code); load(); }).catch((e) => notify(errText(e)));
  };
  const saveOv = () => {
    if (!ov) return; const reason = ask(); if (reason === null) return;
    setChannelTypeCountry({ ...ov, country: ov.country.toUpperCase() }, reason).then(() => { notify("Saved"); setOv(null); load(); if (sel) void listChannelTypeCountries(sel).then(setOverrides); }).catch((e) => notify(errText(e)));
  };
  const numField = (label: string, get: number | null, set: (v: number | null) => void) => (
    <div className="field"><label>{label}<input className="input" type="number" step="0.01" disabled={!isSuper} value={get == null ? "" : String(get)} onChange={(e) => set(numOrNull(e.target.value))} /></label></div>
  );
  const ovNum = (label: string, k: "ownCostFlatEur" | "ownCostPercent" | "marginFlatEur" | "marginPercent" | "premiumEur" | "minFeeEur" | "maxFeeEur") => (
    <div className="field"><label>{label}<input className="input" type="number" step="0.01" disabled={!isSuper} placeholder="type default" value={ov?.[k] == null ? "" : String(ov[k])} onChange={(e) => ov && setOv({ ...ov, [k]: numOrNull(e.target.value) })} /></label></div>
  );
  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div className="text-muted" style={{ fontSize: 12 }}>
        The transfer price varies with how the money is paid out. Each type below is priced from its own cost (PayRus agents) or from the partner contract terms, plus the policy margin and the adjustments set here. Every parameter can be overridden per country. Only the superadmin changes them.
      </div>
      {!isSuper && <div className="tag tag-neutral">Only the superadmin can change payout types.</div>}
      {(types ?? []).map((t) => (
        <button key={t.code} type="button" onClick={() => pick(t)} className="card" style={{ textAlign: "left", cursor: "pointer", border: sel === t.code ? "2px solid var(--color-primary-500, #1D3F6B)" : undefined }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <strong>{t.label} <span className="text-muted" style={{ fontWeight: 400 }}>· {t.code}</span></strong>
            <span style={t.active ? chip("#DDF3E8", "#1B6B45") : chip("#FBE0E4", "#A3243B")}>{t.active ? "on" : "off"}</span>
          </div>
          <span className="text-muted" style={{ fontSize: 12 }}>
            {t.category.replace("_", " ")} · {t.method} · cost {t.costSource === "own" ? `own ${n2(t.ownCostFlatEur)} EUR + ${n2(t.ownCostPercent * 100)}%` : "partner terms"} · margin {n2(t.marginFlatEur)} EUR + {n2(t.marginPercent * 100)}% · {t.deliveryTime?.replace(/_/g, " ") ?? "delivery from terms"}{t.countryOverrides > 0 ? ` · ${t.countryOverrides} country override(s)` : ""}
          </span>
        </button>
      ))}
      <div><button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => { setSel(null); setForm(blankType()); setOv(null); }}>Add a payout type</button></div>

      {form && (
        <div className="card" style={{ display: "grid", gap: "var(--space-3)" }}>
          <div className="card-title">{form.code ? `Set up: ${form.label}` : "New payout type"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "var(--space-2)" }}>
            <div className="field"><label>Code<input className="input" disabled={!isSuper || !!sel} maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })} /></label></div>
            <div className="field"><label>Label<input className="input" disabled={!isSuper} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></label></div>
            <div className="field"><label>Category<select className="input" disabled={!isSuper} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></label></div>
            <div className="field"><label>Payout method<select className="input" disabled={!isSuper} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{METHODS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label></div>
            <div className="field"><label>Agent network<select className="input" disabled={!isSuper} value={form.agentKind ?? ""} onChange={(e) => setForm({ ...form, agentKind: e.target.value || null })}><option value="">—</option><option value="payrus_direct">PayRus direct agents</option><option value="correspondent">Partner agents</option></select></label></div>
            <div className="field"><label>Cost comes from<select className="input" disabled={!isSuper} value={form.costSource} onChange={(e) => setForm({ ...form, costSource: e.target.value })}><option value="partner">Partner contract terms</option><option value="own">PayRus own cost</option></select></label></div>
            <div className="field"><label>Default delivery<select className="input" disabled={!isSuper} value={form.deliveryTime ?? ""} onChange={(e) => setForm({ ...form, deliveryTime: e.target.value || null })}><option value="">from terms</option>{DELIVERY.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}</select></label></div>
            {numField("Sort order", form.sortOrder, (v) => setForm({ ...form, sortOrder: v ?? 100 }))}
            {numField("Own cost flat EUR", form.ownCostFlatEur, (v) => setForm({ ...form, ownCostFlatEur: v ?? 0 }))}
            {numField("Own cost % (0.008)", form.ownCostPercent, (v) => setForm({ ...form, ownCostPercent: v ?? 0 }))}
            {numField("Type margin flat EUR", form.marginFlatEur, (v) => setForm({ ...form, marginFlatEur: v ?? 0 }))}
            {numField("Type margin % (0.005)", form.marginPercent, (v) => setForm({ ...form, marginPercent: v ?? 0 }))}
            {numField("Premium EUR", form.premiumEur, (v) => setForm({ ...form, premiumEur: v ?? 0 }))}
            {numField("Min fee EUR", form.minFeeEur, (v) => setForm({ ...form, minFeeEur: v }))}
            {numField("Max fee EUR", form.maxFeeEur, (v) => setForm({ ...form, maxFeeEur: v }))}
          </div>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={!isSuper} checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Offered to senders</label>
          <div className="field"><label>Onboarding requirements (one per line)
            <textarea className="input" rows={5} disabled={!isSuper} value={form.onboardingRequirements.join("\n")} onChange={(e) => setForm({ ...form, onboardingRequirements: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })} /></label></div>
          <div className="field"><label>Notes<input className="input" disabled={!isSuper} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} /></label></div>
          <div><button type="button" className="btn btn-primary" disabled={!isSuper || !form.code || !form.label} onClick={save}>Save payout type</button></div>

          {sel && (
            <>
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>Onboarding readiness</div>
              {ready.map((r, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}><span style={SEV[r.severity]}>{r.severity}</span><span>{r.message}</span></div>)}
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>Country overrides</div>
              {overrides.length === 0 && <div className="text-muted" style={{ fontSize: 12 }}>None — every country follows the type defaults.</div>}
              {overrides.map((o) => (
                <div key={o.country} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 13 }}>
                  <strong>{o.country}</strong><span>{o.active ? "on" : "off"}</span>
                  <span className="text-muted">margin {n2(o.marginFlatEur)} / {n2(o.marginPercent)} · own {n2(o.ownCostFlatEur)} / {n2(o.ownCostPercent)} · premium {n2(o.premiumEur)} · fee {n2(o.minFeeEur)}–{n2(o.maxFeeEur)}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => setOv({ ...o })}>Edit</button>
                  <button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => { const r = ask(); if (r === null) return; clearChannelTypeCountry(o.code, o.country, r).then(() => { notify("Removed"); load(); }).catch((e) => notify(errText(e))); }}>Remove</button>
                </div>
              ))}
              <div><button type="button" className="btn btn-ghost" disabled={!isSuper} onClick={() => setOv(blankOverride(sel))}>Add a country override</button></div>
              {ov && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--space-2)" }}>
                  <div className="field"><label>Country<input className="input" maxLength={2} disabled={!isSuper} value={ov.country} onChange={(e) => setOv({ ...ov, country: e.target.value.toUpperCase() })} /></label></div>
                  {ovNum("Own cost flat EUR", "ownCostFlatEur")}{ovNum("Own cost %", "ownCostPercent")}{ovNum("Margin flat EUR", "marginFlatEur")}{ovNum("Margin %", "marginPercent")}{ovNum("Premium EUR", "premiumEur")}{ovNum("Min fee EUR", "minFeeEur")}{ovNum("Max fee EUR", "maxFeeEur")}
                  <div className="field"><label>Delivery<select className="input" disabled={!isSuper} value={ov.deliveryTime ?? ""} onChange={(e) => setOv({ ...ov, deliveryTime: e.target.value || null })}><option value="">type default</option>{DELIVERY.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}</select></label></div>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" disabled={!isSuper} checked={ov.active} onChange={(e) => setOv({ ...ov, active: e.target.checked })} />Offered here</label>
                  <div><button type="button" className="btn btn-primary" disabled={!isSuper || ov.country.length !== 2} onClick={saveOv}>Save override</button></div>
                </div>
              )}
              <div style={hr} />
              <div className="card-title" style={{ fontSize: 14 }}>Price check</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="field"><label>Country<input className="input" style={{ width: 70 }} maxLength={2} value={sim.country} onChange={(e) => setSim({ ...sim, country: e.target.value.toUpperCase() })} /></label></div>
                <div className="field"><label>Amount USD<input className="input" style={{ width: 100 }} inputMode="decimal" value={sim.amount} onChange={(e) => setSim({ ...sim, amount: e.target.value })} /></label></div>
                <button type="button" className="btn btn-primary" onClick={() => simulateChannelType(sim.country, sel, Number(sim.amount) || 100).then((rows) => setSim((s) => ({ ...s, rows }))).catch((e) => notify(errText(e)))}>Simulate</button>
              </div>
              {sim.rows?.map((r, i) => <div key={i} style={{ fontSize: 13 }}>Sender fee <strong>{n2(r.feeEur)} EUR</strong> · PayRus cost {n2(r.costEur)} EUR · {r.partnerName ?? "PayRus network"} · {r.deliveryTime?.replace(/_/g, " ") ?? "—"} · {r.source}</div>)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
