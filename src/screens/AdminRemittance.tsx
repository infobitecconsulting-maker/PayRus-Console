// Remittance monitor: corridor volumes, delivery-method mix and stuck transfers,
// derived from the transfers the staff member is already permitted to read
// (same admin_list_transfers RPC and RLS as the Transactions tab — no new access).
import { useEffect, useState } from "react";
import type { Locale } from "../types.ts";
import { getCurrentFxMarginConfig, type FxMarginConfig } from "../lib/adminConfig.ts";
import { errorText, type MyPermissions, type StaffTransfer } from "../lib/adminStaff.ts";
import { listCorridors, listCorridorEvents, setCorridorStatus, upsertCorridor, listFeeHistory, setRemittanceFee, type Corridor, type CorridorEvent, type FeeVersion } from "../lib/corridors.ts";

const COPY: Record<Locale, Record<string, string>> = {
  en: { pricing: "Pricing vs benchmark (EUR 200)", live: "Live customer cost", target: "Benchmark pilot tariff", wb: "World Bank global mean (Q3 2025)", gap: "Gap to pilot tariff", note: "Live = FX margin + commission from Configuration. Pilot tariff = EUR 2.99 + 1.00% FX (proposal, not approved). Edit the margin under Configuration.", title: "Remittance monitor", empty: "No remittances yet.", total: "Transfers", volume: "Volume by send currency", corridors: "Corridors", methods: "Delivery methods", stuck: "Needs attention", stuckHint: "Pending, failed or disputed remittances.", other: "Not specified" },
  fr: { pricing: "Tarification vs référence (200 EUR)", live: "Coût client actuel", target: "Tarif pilote de référence", wb: "Moyenne mondiale Banque mondiale (T3 2025)", gap: "Écart vs tarif pilote", note: "Actuel = marge de change + commission de la Configuration. Tarif pilote = 2,99 EUR + 1,00 % de change (proposition, non approuvée). Modifiez la marge dans Configuration.", title: "Suivi des transferts", empty: "Aucun transfert pour l’instant.", total: "Transferts", volume: "Volume par devise d’envoi", corridors: "Corridors", methods: "Modes de livraison", stuck: "À traiter", stuckHint: "Transferts en attente, échoués ou contestés.", other: "Non précisé" },
  pt: { pricing: "Preços vs referência (200 EUR)", live: "Custo atual para o cliente", target: "Tarifa piloto de referência", wb: "Média global do Banco Mundial (T3 2025)", gap: "Diferença face à tarifa piloto", note: "Atual = margem cambial + comissão da Configuração. Tarifa piloto = 2,99 EUR + 1,00% de câmbio (proposta, não aprovada). Edite a margem em Configuração.", title: "Monitor de remessas", empty: "Ainda sem remessas.", total: "Transferências", volume: "Volume por moeda de envio", corridors: "Corredores", methods: "Métodos de entrega", stuck: "Requer atenção", stuckHint: "Remessas pendentes, falhadas ou contestadas.", other: "Não especificado" },
  es: { pricing: "Precios vs referencia (200 EUR)", live: "Coste actual para el cliente", target: "Tarifa piloto de referencia", wb: "Media mundial del Banco Mundial (T3 2025)", gap: "Diferencia con la tarifa piloto", note: "Actual = margen de cambio + comisión de Configuración. Tarifa piloto = 2,99 EUR + 1,00% de cambio (propuesta, no aprobada). Edite el margen en Configuración.", title: "Monitor de remesas", empty: "Aún no hay remesas.", total: "Transferencias", volume: "Volumen por moneda de envío", corridors: "Corredores", methods: "Métodos de entrega", stuck: "Requiere atención", stuckHint: "Remesas pendientes, fallidas o disputadas.", other: "No especificado" },
};

const G: Record<Locale, Record<string, string>> = {
  en: { flatPrompt: "Flat fee for this corridor in EUR (blank = global fee):", pctPrompt: "Percentage fee for this corridor, e.g. 0 for none (blank = global):", fee: "Fee", inherit: "global fee", title: "Corridor guardrails", hint: "Each corridor must earn at least its contribution floor per transfer (fee + FX margin - payout, processing, pay-in and risk cost), or transfers on it are refused.", ref: "At", contrib: "Contribution", floor: "floor", active: "Active", suspended: "Suspended", below: "Below floor", orders: "orders (30d)", suspend: "Suspend", resume: "Resume", reprice: "Reprice", add: "Add corridor", reason: "Reason for suspending (shown in the log):", addPrompt: "Corridor as FROM>TO, e.g. EUR>GHS", margin: "FX margin % for this corridor (blank = global):", floorPrompt: "Contribution floor per transfer (EUR):", payoutPrompt: "Payout cost per transfer (EUR):", minPrompt: "Minimum send amount (send currency):", saved: "Corridor saved.", history: "Recent changes", none: "No corridors configured.", override: "override", global: "global avg" },
  fr: { flatPrompt: "Frais fixes pour ce corridor en EUR (vide = frais globaux) :", pctPrompt: "Frais en pourcentage pour ce corridor, ex. 0 pour aucun (vide = global) :", fee: "Frais", inherit: "frais globaux", title: "Garde-fous par corridor", hint: "Chaque corridor doit rapporter au moins son plancher de contribution par transfert (frais + marge de change - coûts de paiement sortant, traitement, encaissement et risque), sinon les transferts sont refusés.", ref: "Pour", contrib: "Contribution", floor: "plancher", active: "Actif", suspended: "Suspendu", below: "Sous le plancher", orders: "ordres (30 j)", suspend: "Suspendre", resume: "Réactiver", reprice: "Retarifer", add: "Ajouter un corridor", reason: "Motif de la suspension (visible dans le journal) :", addPrompt: "Corridor au format DE>VERS, ex. EUR>GHS", margin: "Marge de change % pour ce corridor (vide = globale) :", floorPrompt: "Plancher de contribution par transfert (EUR) :", payoutPrompt: "Coût de paiement sortant par transfert (EUR) :", minPrompt: "Montant minimum d’envoi (devise d’envoi) :", saved: "Corridor enregistré.", history: "Modifications récentes", none: "Aucun corridor configuré.", override: "spécifique", global: "globale" },
  pt: { flatPrompt: "Taxa fixa para este corredor em EUR (vazio = taxa global):", pctPrompt: "Taxa percentual para este corredor, ex. 0 para nenhuma (vazio = global):", fee: "Taxa", inherit: "taxa global", title: "Salvaguardas por corredor", hint: "Cada corredor tem de render pelo menos o seu mínimo de contribuição por transferência (taxa + margem cambial - custos de payout, processamento, cobrança e risco), caso contrário as transferências são recusadas.", ref: "Em", contrib: "Contribuição", floor: "mínimo", active: "Ativo", suspended: "Suspenso", below: "Abaixo do mínimo", orders: "ordens (30 d)", suspend: "Suspender", resume: "Retomar", reprice: "Reprecificar", add: "Adicionar corredor", reason: "Motivo da suspensão (visível no registo):", addPrompt: "Corredor como DE>PARA, ex. EUR>GHS", margin: "Margem cambial % para este corredor (vazio = global):", floorPrompt: "Mínimo de contribuição por transferência (EUR):", payoutPrompt: "Custo de payout por transferência (EUR):", minPrompt: "Montante mínimo de envio (moeda de envio):", saved: "Corredor guardado.", history: "Alterações recentes", none: "Nenhum corredor configurado.", override: "específica", global: "global" },
  es: { flatPrompt: "Comisión fija de este corredor en EUR (vacío = comisión global):", pctPrompt: "Comisión porcentual de este corredor, p. ej. 0 para ninguna (vacío = global):", fee: "Comisión", inherit: "comisión global", title: "Salvaguardas por corredor", hint: "Cada corredor debe generar al menos su mínimo de contribución por transferencia (comisión + margen de cambio - costes de pago, procesamiento, cobro y riesgo); de lo contrario se rechazan las transferencias.", ref: "En", contrib: "Contribución", floor: "mínimo", active: "Activo", suspended: "Suspendido", below: "Bajo el mínimo", orders: "órdenes (30 d)", suspend: "Suspender", resume: "Reanudar", reprice: "Reprecificar", add: "Añadir corredor", reason: "Motivo de la suspensión (visible en el registro):", addPrompt: "Corredor como DE>A, p. ej. EUR>GHS", margin: "Margen de cambio % para este corredor (vacío = global):", floorPrompt: "Mínimo de contribución por transferencia (EUR):", payoutPrompt: "Coste de pago por transferencia (EUR):", minPrompt: "Importe mínimo de envío (moneda de envío):", saved: "Corredor guardado.", history: "Cambios recientes", none: "Ningún corredor configurado.", override: "propio", global: "global" },
};

const eur = (n: number | null) => (n === null ? "-" : `${n < 0 ? "-" : ""}€${Math.abs(n).toFixed(2)}`);

const F: Record<Locale, Record<string, string>> = {
  en: { title: "Remittance fee", current: "Current fee", flat: "flat", plus: "plus", global: "global commission", change: "Change fee", flatPrompt: "Flat fee per transfer in EUR (0 = none):", pctPrompt: "Percentage fee, e.g. 0 for none (blank = global commission):", notePrompt: "Reason for the change (kept in the history):", saved: "Fee updated.", history: "Fee history", by: "by", hint: "Applies to every remittance: shown to customers, debited in full, and counted in each corridor's contribution." },
  fr: { title: "Frais de transfert", current: "Frais actuels", flat: "fixe", plus: "plus", global: "commission globale", change: "Modifier les frais", flatPrompt: "Frais fixes par transfert en EUR (0 = aucun) :", pctPrompt: "Frais en pourcentage, ex. 0 pour aucun (vide = commission globale) :", notePrompt: "Motif de la modification (conservé dans l’historique) :", saved: "Frais mis à jour.", history: "Historique des frais", by: "par", hint: "S’applique à chaque transfert : affiché au client, débité en totalité et compté dans la contribution de chaque corridor." },
  pt: { title: "Taxa de remessa", current: "Taxa atual", flat: "fixa", plus: "mais", global: "comissão global", change: "Alterar taxa", flatPrompt: "Taxa fixa por transferência em EUR (0 = nenhuma):", pctPrompt: "Taxa percentual, ex. 0 para nenhuma (vazio = comissão global):", notePrompt: "Motivo da alteração (guardado no histórico):", saved: "Taxa atualizada.", history: "Histórico de taxas", by: "por", hint: "Aplica-se a todas as remessas: mostrada ao cliente, debitada por inteiro e contada na contribuição de cada corredor." },
  es: { title: "Comisión de remesa", current: "Comisión actual", flat: "fija", plus: "más", global: "comisión global", change: "Cambiar comisión", flatPrompt: "Comisión fija por transferencia en EUR (0 = ninguna):", pctPrompt: "Comisión porcentual, p. ej. 0 para ninguna (vacío = comisión global):", notePrompt: "Motivo del cambio (se guarda en el historial):", saved: "Comisión actualizada.", history: "Historial de comisiones", by: "por", hint: "Se aplica a cada remesa: se muestra al cliente, se debita completa y cuenta en la contribución de cada corredor." },
};

function FeeCard({ locale, perms, notify }: { locale: Locale; perms: MyPermissions | null; notify: (m: string) => void }) {
  const f = F[locale] ?? F.en;
  const [rows, setRows] = useState<FeeVersion[] | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { void listFeeHistory(6).then(setRows).catch(() => setRows(null)); }, [tick]);
  if (!rows || rows.length === 0) return null;
  const cur = rows[0];
  const change = () => {
    const a = window.prompt(f.flatPrompt, String(cur.flatFeeEur)); if (a === null) return;
    const b = window.prompt(f.pctPrompt, cur.percentFee === null ? "" : String(cur.percentFee * 100)); if (b === null) return;
    const n = window.prompt(f.notePrompt, ""); if (n === null) return;
    const flat = Number(a); const pct = b.trim() === "" ? null : Number(b) / 100;
    if (!Number.isFinite(flat) || flat < 0 || (pct !== null && !(pct >= 0 && pct < 1))) { notify("Invalid number"); return; }
    void setRemittanceFee(flat, pct, n.trim() || undefined).then(() => { notify(f.saved); setTick((x) => x + 1); }).catch((e) => notify(errorText(e, "error")));
  };
  return (
    <div className="card elev-sm" style={{ gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="card-title">{f.title}</div>
        {(perms?.isAdmin ?? false) && <button type="button" className="btn btn-ghost" onClick={change}>{f.change}</button>}
      </div>
      <div style={{ fontSize: 13 }}>
        {f.current}: <strong>€{cur.flatFeeEur.toFixed(2)} {f.flat}</strong> {f.plus} <strong>{(cur.effectivePercent * 100).toFixed(2)}%</strong>{cur.percentFee === null ? ` (${f.global})` : ""}
      </div>
      <div className="text-muted" style={{ fontSize: 12 }}>{f.hint}</div>
      {rows.length > 1 && (
        <div style={{ borderTop: "1px solid var(--border, #e5e9ee)", paddingTop: 6 }}>
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>{f.history}</div>
          {rows.map((r, i) => (
            <div key={i} className="text-muted" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleString()} · €{r.flatFeeEur.toFixed(2)} + {(r.effectivePercent * 100).toFixed(2)}% · {f.by} {r.decider}{r.note ? ` · ${r.note}` : ""}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function CorridorGuardrails({ locale, perms, notify }: { locale: Locale; perms: MyPermissions | null; notify: (m: string) => void }) {
  const g = G[locale] ?? G.en;
  const [rows, setRows] = useState<Corridor[] | null>(null);
  const [events, setEvents] = useState<CorridorEvent[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    void listCorridors().then(setRows).catch(() => setRows(null));
    void listCorridorEvents(8).then(setEvents).catch(() => setEvents([]));
  }, [tick]);
  if (!rows) return null;

  const canUpdate = perms?.transactions.update ?? false;
  const canPrice = perms?.isAdmin ?? false;
  const run = async (fn: () => Promise<void>, ok?: string) => {
    try { await fn(); if (ok) notify(ok); setTick((n) => n + 1); } catch (e) { notify(errorText(e, "error")); }
  };
  const ask = (label: string, dflt: string) => window.prompt(label, dflt);
  const reprice = (c: Corridor) => {
    const m = ask(g.margin, c.marginOverride === null ? "" : String(c.marginOverride * 100)); if (m === null) return;
    const f = ask(g.floorPrompt, String(c.floorEur)); if (f === null) return;
    const po = ask(g.payoutPrompt, String(c.payoutCostEur)); if (po === null) return;
    const mn = ask(g.minPrompt, String(c.minAmount)); if (mn === null) return;
    const ff = ask(g.flatPrompt, c.flatFeeOverride === null ? "" : String(c.flatFeeOverride)); if (ff === null) return;
    const pf = ask(g.pctPrompt, c.percentFeeOverride === null ? "" : String(c.percentFeeOverride * 100)); if (pf === null) return;
    const margin = m.trim() === "" ? null : Number(m) / 100;
    const flatFee = ff.trim() === "" ? null : Number(ff);
    const pctFee = pf.trim() === "" ? null : Number(pf) / 100;
    const vals = [f, po, mn].map(Number);
    if ((margin !== null && !(margin >= 0 && margin < 1)) || vals.some((v) => !Number.isFinite(v) || v < 0)
      || (flatFee !== null && !(flatFee >= 0 && flatFee <= 100)) || (pctFee !== null && !(pctFee >= 0 && pctFee < 1))) { notify("Invalid number"); return; }
    void run(() => upsertCorridor(c.from, c.to, {
      marginRate: margin, payoutCostEur: vals[1], processingCostEur: c.processingCostEur, payinCostEur: c.payinCostEur, riskCostEur: c.riskCostEur,
      floorEur: vals[0], minAmount: vals[2], maxAmount: null, flatFeeEur: flatFee, percentFee: pctFee,
    }), g.saved);
  };
  const add = () => {
    const v = ask(g.addPrompt, "EUR>"); const m = v?.toUpperCase().match(/^([A-Z]{3})\s*>\s*([A-Z]{3})$/);
    if (!m) return;
    void run(() => upsertCorridor(m[1], m[2], { marginRate: null, payoutCostEur: 1.5, processingCostEur: 1.54, payinCostEur: 0.74, riskCostEur: 0.3, floorEur: 0.5, minAmount: 10, maxAmount: null, flatFeeEur: null, percentFee: null }), g.saved);
  };

  return (
    <div className="card elev-sm" style={{ gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="card-title">{g.title}</div>
        {canPrice && <button type="button" className="btn btn-ghost" onClick={add}>{g.add}</button>}
      </div>
      <div className="text-muted" style={{ fontSize: 12 }}>{g.hint}</div>
      {rows.length === 0 && <div className="text-muted">{g.none}</div>}
      {rows.map((c) => {
        const below = c.refContributionEur !== null && c.refContributionEur < c.floorEur;
        return (
          <div key={`${c.from}${c.to}`} style={{ borderTop: "1px solid var(--border, #e5e9ee)", paddingTop: 8, display: "grid", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong>{c.from} → {c.to}</strong>
              <span style={{ fontSize: 12, fontWeight: 700, color: !c.enabled || below ? "#A3243B" : "#1B6B45" }}>{!c.enabled ? g.suspended : below ? g.below : g.active}</span>
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {c.refAmount !== null && `${g.ref} ${c.refAmount.toLocaleString()} ${c.from} (€200): `}{g.contrib} {eur(c.refContributionEur)} / {g.floor} {eur(c.floorEur)}
              {" · "}FX {c.appliedMargin === null ? "-" : `${(c.appliedMargin * 100).toFixed(2)}%`} ({c.marginOverride === null ? g.global : g.override})
              {" · "}{g.fee} {c.refFee === null ? "-" : c.refFee.toFixed(2)} ({c.flatFeeOverride === null && c.percentFeeOverride === null ? g.inherit : g.override})
              {" · "}{c.orders30d} {g.orders}
            </div>
            {!c.enabled && c.suspendedReason && <div style={{ fontSize: 12 }}>{c.suspendedReason}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {canUpdate && (c.enabled
                ? <button type="button" className="btn btn-ghost" onClick={() => { const r = ask(g.reason, ""); if (r && r.trim().length >= 3) void run(() => setCorridorStatus(c.from, c.to, false, r.trim())); }}>{g.suspend}</button>
                : <button type="button" className="btn btn-ghost" onClick={() => void run(() => setCorridorStatus(c.from, c.to, true))}>{g.resume}</button>)}
              {canPrice && <button type="button" className="btn btn-ghost" onClick={() => reprice(c)}>{g.reprice}</button>}
            </div>
          </div>
        );
      })}
      {events.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border, #e5e9ee)", paddingTop: 8 }}>
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 700 }}>{g.history}</div>
          {events.map((e, i) => (
            <div key={i} className="text-muted" style={{ fontSize: 12 }}>{new Date(e.createdAt).toLocaleString()} · {e.from}→{e.to} · {e.action}{typeof e.detail.reason === "string" ? ` · ${e.detail.reason}` : ""}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// New remittances carry a note "Name · Method · Provider · ••••1234 · EUR→XAF".
const corridorOf = (note: string | null) => note?.match(/\b([A-Z]{3})→([A-Z]{3})\b/)?.slice(1, 3).join(" → ") ?? null;
const methodOf = (note: string | null) => (note ? note.split(" · ")[1] ?? null : null);
const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

const PILOT_COST = (2.99 + 0.01 * 200) / 200; // proposal in the MTT benchmark: EUR 2.99 + 1.00% FX = 2.495%
const WORLD_BANK_MEAN = 0.0636;
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function PricingGap({ c }: { c: Record<string, string> }) {
  const [cfg, setCfg] = useState<FxMarginConfig | null>(null);
  const [fee, setFee] = useState<FeeVersion | null>(null);
  useEffect(() => {
    void getCurrentFxMarginConfig().then(setCfg).catch(() => setCfg(null));
    void listFeeHistory(1).then((v) => setFee(v[0] ?? null)).catch(() => setFee(null));
  }, []);
  if (!cfg) return null;
  // Total customer cost at EUR 200: FX margin + (flat fee + percentage) / 200. Falls back to the global commission before migration 0034.
  const live = cfg.marginRate + (fee ? (fee.flatFeeEur + fee.effectivePercent * 200) / 200 : cfg.commissionRate);
  const row = (k: string, v: string, bad = false) => <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{k}</span><strong style={bad ? { color: "#A3243B" } : undefined}>{v}</strong></div>;
  return (
    <div className="card elev-sm" style={{ gap: 6 }}>
      <div className="card-title">{c.pricing}</div>
      {row(c.live, pct(live), live > WORLD_BANK_MEAN)}
      {row(c.target, pct(PILOT_COST))}
      {row(c.wb, pct(WORLD_BANK_MEAN))}
      {row(c.gap, `${live >= PILOT_COST ? "+" : ""}${((live - PILOT_COST) * 100).toFixed(2)} pts`, live > PILOT_COST)}
      <div className="text-muted" style={{ fontSize: 12 }}>{c.note}</div>
    </div>
  );
}

export function RemittanceTab({ transfers, locale, perms, notify }: { transfers: StaffTransfer[]; locale: Locale; perms: MyPermissions | null; notify: (m: string) => void }) {
  const c = COPY[locale] ?? COPY.en;
  const rem = transfers.filter((t) => t.type === "remittance");
  if (rem.length === 0) return <div style={{ display: "grid", gap: "var(--space-3)" }}><PricingGap c={c} /><FeeCard locale={locale} perms={perms} notify={notify} /><CorridorGuardrails locale={locale} perms={perms} notify={notify} /><div className="text-muted">{c.empty}</div></div>;

  const volume = new Map<string, number>();
  const corridors = new Map<string, number>();
  const methods = new Map<string, number>();
  for (const t of rem) {
    bump(volume, t.currency, t.amount);
    bump(corridors, corridorOf(t.note) ?? `${t.currency} → ?`);
    bump(methods, methodOf(t.note) ?? c.other);
  }
  const attention = rem.filter((t) => ["pending", "failed", "disputed", "refund_pending"].includes(t.state));

  const list = (title: string, rows: [string, number][], fmt: (n: number) => string = String) => (
    <div className="card elev-sm" style={{ gap: 6 }}>
      <div className="card-title">{title}</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{k}</span><strong>{fmt(v)}</strong></div>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <PricingGap c={c} />
      <FeeCard locale={locale} perms={perms} notify={notify} />
      <CorridorGuardrails locale={locale} perms={perms} notify={notify} />
      <div className="card elev-sm"><div className="card-title">{c.title}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{rem.length}</div><div className="text-muted" style={{ fontSize: 12 }}>{c.total}</div></div>
      {list(c.volume, top(volume), (n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 }))}
      {list(c.corridors, top(corridors))}
      {list(c.methods, top(methods))}
      <div className="card elev-sm" style={{ gap: 6 }}>
        <div className="card-title">{c.stuck} ({attention.length})</div>
        <div className="text-muted" style={{ fontSize: 12 }}>{c.stuckHint}</div>
        {attention.slice(0, 10).map((t) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 8 }}>
            <span style={{ fontFamily: "monospace" }}>{t.reference}</span>
            <span>{t.amount.toLocaleString()} {t.currency} · {t.state.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
