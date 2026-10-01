// Institutions tab: how the business modules (invoicing, payroll, grants,
// pension, microfinance, SACCO, insurance, funds, development finance,
// revenue, procurement) are being used across customers — adoption per
// sub-profile, volume per record kind, the four-eyes backlog and items that
// were approved but never settled.
import { useEffect, useState } from "react";
import type { Locale } from "../types.ts";
import { errorText } from "../lib/adminStaff.ts";
import { getInstHealth, listInstOverview, listSubProfileStats, type InstHealth, type InstOverviewRow, type SubProfileStat } from "../lib/institutions.ts";

const COPY: Record<Locale, Record<string, string>> = {
  en: { title: "Institutional modules", intro: "Adoption and money flow across specialised profiles. Read-only: customers act on their own records; approvals need a second authorised person.", adoption: "Profile specialisations", holders: "accounts", kind: "Record type", owners: "Customers", records: "Records", total: "Total value", open: "Open value", settled: "Settled", approval: "Awaiting approval", stuck: "Approved, unsettled > 7d", loading: "Loading…", empty: "No records yet — customers create them in the App's Business modules.", denied: "Staff access required.", backlog: "Four-eyes backlog", stuckTotal: "Stuck items", health: "Finance controls", unmatched: "Unreconciled bank lines", matchedLines: "Reconciled lines", overdue: "Overdue receivables", budgetsAlert: "Budgets at alert", budgetsOver: "Budgets exceeded", chains: "Multi-approver policies", limits: "Approver limits" },
  fr: { title: "Modules institutionnels", intro: "Adoption et flux d’argent par profil spécialisé. Lecture seule : les clients agissent sur leurs propres enregistrements ; les approbations exigent une seconde personne autorisée.", adoption: "Spécialisations de profil", holders: "comptes", kind: "Type", owners: "Clients", records: "Enregistrements", total: "Valeur totale", open: "Valeur ouverte", settled: "Réglé", approval: "En attente d’approbation", stuck: "Approuvé, non réglé > 7 j", loading: "Chargement…", empty: "Aucun enregistrement — les clients les créent dans les Modules métier de l'App.", denied: "Accès personnel requis.", backlog: "File de double validation", stuckTotal: "Éléments bloqués", health: "Contrôles financiers", unmatched: "Lignes bancaires non rapprochées", matchedLines: "Lignes rapprochées", overdue: "Créances en retard", budgetsAlert: "Budgets en alerte", budgetsOver: "Budgets dépassés", chains: "Politiques multi-approbateurs", limits: "Plafonds d’approbation" },
  pt: { title: "Módulos institucionais", intro: "Adoção e fluxo de dinheiro por perfil especializado. Só leitura: os clientes atuam nos seus próprios registos; as aprovações exigem uma segunda pessoa autorizada.", adoption: "Especializações de perfil", holders: "contas", kind: "Tipo", owners: "Clientes", records: "Registos", total: "Valor total", open: "Valor em aberto", settled: "Liquidado", approval: "Aguarda aprovação", stuck: "Aprovado, não liquidado > 7 d", loading: "A carregar…", empty: "Ainda sem registos — os clientes criam-nos nos Módulos de negócio da App.", denied: "Acesso de equipa necessário.", backlog: "Fila de dupla validação", stuckTotal: "Itens parados", health: "Controlos financeiros", unmatched: "Linhas bancárias por conciliar", matchedLines: "Linhas conciliadas", overdue: "Recebíveis em atraso", budgetsAlert: "Orçamentos em alerta", budgetsOver: "Orçamentos excedidos", chains: "Políticas multi-aprovador", limits: "Limites de aprovação" },
  es: { title: "Módulos institucionales", intro: "Adopción y flujo de dinero por perfil especializado. Solo lectura: los clientes actúan sobre sus propios registros; las aprobaciones requieren una segunda persona autorizada.", adoption: "Especializaciones de perfil", holders: "cuentas", kind: "Tipo", owners: "Clientes", records: "Registros", total: "Valor total", open: "Valor abierto", settled: "Liquidado", approval: "Pendiente de aprobación", stuck: "Aprobado, sin liquidar > 7 d", loading: "Cargando…", empty: "Aún sin registros — los clientes los crean en los Módulos de negocio de la App.", denied: "Se requiere acceso de personal.", backlog: "Cola de doble validación", stuckTotal: "Elementos bloqueados", health: "Controles financieros", unmatched: "Líneas bancarias sin conciliar", matchedLines: "Líneas conciliadas", overdue: "Cuentas por cobrar vencidas", budgetsAlert: "Presupuestos en alerta", budgetsOver: "Presupuestos superados", chains: "Políticas multiaprobador", limits: "Límites de aprobación" },
};

export function InstitutionsTab({ locale }: { locale: Locale }) {
  const C = COPY[locale] ?? COPY.en;
  const [rows, setRows] = useState<InstOverviewRow[] | null>(null);
  const [subs, setSubs] = useState<SubProfileStat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<InstHealth | null>(null);

  useEffect(() => {
    void listInstOverview().then(setRows).catch((e) => { setRows([]); setError(errorText(e, C.denied)); });
    void listSubProfileStats().then(setSubs).catch(() => setSubs([]));
    void getInstHealth().then(setHealth).catch(() => setHealth(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backlog = (rows ?? []).reduce((s, r) => s + r.awaitingApproval, 0);
  const stuck = (rows ?? []).reduce((s, r) => s + r.stuckOver7d, 0);
  const active = (rows ?? []).filter((r) => r.records > 0);
  const num = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 0 });

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div><h2 style={{ margin: "0 0 4px" }}>{C.title}</h2><p className="text-muted" style={{ margin: 0 }}>{C.intro}</p></div>
      {rows === null && <div className="tag tag-neutral">{C.loading}</div>}
      {error && <div className="tag tag-neutral">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.backlog}</div><strong style={{ fontSize: 24 }}>{backlog}</strong></div>
        <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.stuckTotal}</div><strong style={{ fontSize: 24 }}>{stuck}</strong></div>
        <div className="card elev-sm"><div className="text-muted" style={{ fontSize: 12 }}>{C.records}</div><strong style={{ fontSize: 24 }}>{num(active.reduce((s, r) => s + r.records, 0))}</strong></div>
      </div>

      {health && (
        <div className="card elev-sm" style={{ gap: 8 }}>
          <strong>{C.health}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>
            {([[C.unmatched, health.unmatchedLines, health.unmatchedLines > 0], [C.matchedLines, health.matchedLines, false], [C.overdue, `${health.overdueInvoices} · ${num(health.overdueAmount)}`, health.overdueInvoices > 0],
              [C.budgetsAlert, health.budgetsWarning, health.budgetsWarning > 0], [C.budgetsOver, health.budgetsOver, health.budgetsOver > 0], [C.chains, health.chainPolicies, false], [C.limits, health.approvalLimits, false]] as [string, number | string, boolean][]).map(([label, value, warn]) => (
              <div key={label}><div className="text-muted" style={{ fontSize: 12 }}>{label}</div><strong style={{ fontSize: 20 }} className={warn ? "tag tag-warning" : undefined}>{value}</strong></div>
            ))}
          </div>
        </div>
      )}

      <div className="card elev-sm" style={{ gap: 8 }}>
        <strong>{C.adoption}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {subs.map((s) => <span key={s.subProfile} className={s.holders > 0 ? "tag tag-success" : "tag tag-neutral"}>{s.label} · {s.holders} {C.holders}</span>)}
        </div>
      </div>

      {rows && active.length > 0 && !error && (
        <div className="card elev-sm" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr className="text-muted" style={{ textAlign: "left" }}>
                <th style={{ padding: 6 }}>{C.kind}</th><th>{C.owners}</th><th>{C.records}</th><th>{C.total}</th><th>{C.open}</th><th>{C.settled}</th><th>{C.approval}</th><th>{C.stuck}</th>
              </tr>
            </thead>
            <tbody>
              {active.map((r) => (
                <tr key={r.kind} style={{ borderTop: "1px solid var(--border, #ddd)" }}>
                  <td style={{ padding: 6 }}><strong>{r.kindLabel}</strong><div className="text-muted" style={{ fontSize: 11 }}>{r.moduleKey}</div></td>
                  <td>{r.owners}</td><td>{r.records}</td><td>{num(r.totalAmount)}</td><td>{num(r.openAmount)}</td><td>{num(r.settledAmount)}</td>
                  <td>{r.awaitingApproval > 0 ? <span className="tag tag-warning">{r.awaitingApproval}</span> : 0}</td>
                  <td>{r.stuckOver7d > 0 ? <span className="tag tag-warning">{r.stuckOver7d}</span> : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && active.length === 0 && !error && <div className="text-muted">{C.empty}</div>}
    </div>
  );
}
