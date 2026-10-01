// Institutions tab: how the business modules (invoicing, payroll, grants,
// pension, microfinance, SACCO, insurance, funds, development finance,
// revenue, procurement) are being used across customers — adoption per
// sub-profile, volume per record kind, the four-eyes backlog and items that
// were approved but never settled.
import { useEffect, useState } from "react";
import type { Locale } from "../types.ts";
import { errorText } from "../lib/adminStaff.ts";
import { listInstOverview, listSubProfileStats, type InstOverviewRow, type SubProfileStat } from "../lib/institutions.ts";

const COPY: Record<Locale, Record<string, string>> = {
  en: { title: "Institutional modules", intro: "Adoption and money flow across specialised profiles. Read-only: customers act on their own records; approvals need a second authorised person.", adoption: "Profile specialisations", holders: "accounts", kind: "Record type", owners: "Customers", records: "Records", total: "Total value", open: "Open value", settled: "Settled", approval: "Awaiting approval", stuck: "Approved, unsettled > 7d", loading: "Loading…", empty: "No data yet — apply migrations 0053 and 0054.", denied: "Staff access required.", backlog: "Four-eyes backlog", stuckTotal: "Stuck items" },
  fr: { title: "Modules institutionnels", intro: "Adoption et flux d’argent par profil spécialisé. Lecture seule : les clients agissent sur leurs propres enregistrements ; les approbations exigent une seconde personne autorisée.", adoption: "Spécialisations de profil", holders: "comptes", kind: "Type", owners: "Clients", records: "Enregistrements", total: "Valeur totale", open: "Valeur ouverte", settled: "Réglé", approval: "En attente d’approbation", stuck: "Approuvé, non réglé > 7 j", loading: "Chargement…", empty: "Pas encore de données — appliquez les migrations 0053 et 0054.", denied: "Accès personnel requis.", backlog: "File de double validation", stuckTotal: "Éléments bloqués" },
  pt: { title: "Módulos institucionais", intro: "Adoção e fluxo de dinheiro por perfil especializado. Só leitura: os clientes atuam nos seus próprios registos; as aprovações exigem uma segunda pessoa autorizada.", adoption: "Especializações de perfil", holders: "contas", kind: "Tipo", owners: "Clientes", records: "Registos", total: "Valor total", open: "Valor em aberto", settled: "Liquidado", approval: "Aguarda aprovação", stuck: "Aprovado, não liquidado > 7 d", loading: "A carregar…", empty: "Sem dados — aplique as migrações 0053 e 0054.", denied: "Acesso de equipa necessário.", backlog: "Fila de dupla validação", stuckTotal: "Itens parados" },
  es: { title: "Módulos institucionales", intro: "Adopción y flujo de dinero por perfil especializado. Solo lectura: los clientes actúan sobre sus propios registros; las aprobaciones requieren una segunda persona autorizada.", adoption: "Especializaciones de perfil", holders: "cuentas", kind: "Tipo", owners: "Clientes", records: "Registros", total: "Valor total", open: "Valor abierto", settled: "Liquidado", approval: "Pendiente de aprobación", stuck: "Aprobado, sin liquidar > 7 d", loading: "Cargando…", empty: "Sin datos — aplique las migraciones 0053 y 0054.", denied: "Se requiere acceso de personal.", backlog: "Cola de doble validación", stuckTotal: "Elementos bloqueados" },
};

export function InstitutionsTab({ locale }: { locale: Locale }) {
  const C = COPY[locale] ?? COPY.en;
  const [rows, setRows] = useState<InstOverviewRow[] | null>(null);
  const [subs, setSubs] = useState<SubProfileStat[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listInstOverview().then(setRows).catch((e) => { setRows([]); setError(errorText(e, C.denied)); });
    void listSubProfileStats().then(setSubs).catch(() => setSubs([]));
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

      <div className="card elev-sm" style={{ gap: 8 }}>
        <strong>{C.adoption}</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {subs.map((s) => <span key={s.subProfile} className={s.holders > 0 ? "tag tag-success" : "tag tag-neutral"}>{s.label} · {s.holders} {C.holders}</span>)}
        </div>
      </div>

      {rows && rows.length > 0 && !error && (
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
      {rows && rows.length === 0 && !error && <div className="text-muted">{C.empty}</div>}
    </div>
  );
}
