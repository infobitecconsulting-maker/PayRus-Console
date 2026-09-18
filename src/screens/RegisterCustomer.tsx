import { useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { adminCreateUser } from "../lib/identity.ts";

// Agent/Treasury-assisted manual registration — same admin_create_user RPC
// and same reduced field set (name, email, role, kind) as App/'s
// src/pages/register-customer/page.tsx, for the same reason: a customer at
// an agent counter with no smartphone/data to self-register with. Uses the
// exact DB role slugs App's own CUSTOMER_ROLES uses (not this console's own
// capitalized Role vocabulary — see lib/roleMapping.ts).
const CUSTOMER_ROLES = ["personal", "merchant", "group"] as const;

export function RegisterCustomer({
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
  const R = D.registerCustomer;
  // D.roles is index-aligned with the Role type's own declaration order
  // (Personal, Merchant, Agent, Treasury, Institution, NGO, Group, Other) —
  // the same assumption Console.tsx makes via data.roleOrder.indexOf(profile).
  const roleLabels: Record<(typeof CUSTOMER_ROLES)[number], string> = {
    personal: D.roles[0] ?? "Personal",
    merchant: D.roles[1] ?? "Merchant",
    group: D.roles[6] ?? "Group",
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof CUSTOMER_ROLES)[number]>("personal");
  const [kind, setKind] = useState<"individual" | "organisation">("individual");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<{ name: string; email: string } | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await adminCreateUser({ name: name.trim(), email: email.trim().toLowerCase(), role, kind });
      setMessage(result.alreadyExisted ? R.alreadyExisted : R.created);
      setLastCreated({ name: name.trim(), email: email.trim().toLowerCase() });
      setName("");
      setEmail("");
      setRole("personal");
      setKind("individual");
    } catch {
      setMessage(R.saveFailed);
    } finally {
      setSaving(false);
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

      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 520, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{R.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-6)" }}>{R.subtitle}</p>

        <div className="card elev-sm" style={{ gap: "var(--space-3)" }}>
          <div className="field">
            <label>{R.name}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </div>
          <div className="field">
            <label>{R.email}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div className="field">
              <label>{R.role}</label>
              <select value={role} onChange={(e) => setRole(e.target.value as (typeof CUSTOMER_ROLES)[number])} className="input">
                {CUSTOMER_ROLES.map((r) => <option key={r} value={r}>{roleLabels[r]}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{R.kind}</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as "individual" | "organisation")} className="input">
                <option value="individual">{R.kindIndividual}</option>
                <option value="organisation">{R.kindOrganisation}</option>
              </select>
            </div>
          </div>
          <button type="button" className="btn btn-primary" disabled={saving || !name.trim() || !email.trim()} onClick={() => void handleSubmit()}>
            {saving ? R.saving : R.submit}
          </button>
        </div>

        {message && <div className="tag tag-neutral" style={{ marginTop: "var(--space-3)" }}>{message}</div>}
        {lastCreated && (
          <div className="card" style={{ marginTop: "var(--space-3)", background: "var(--color-accent-100)" }}>
            {lastCreated.name} · {lastCreated.email}
          </div>
        )}
      </div>
    </div>
  );
}
