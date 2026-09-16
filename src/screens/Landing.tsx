import type { Desk, Locale } from "../types.ts";
import { LOCALES } from "../i18n.ts";
import { PayRusLogo, SegGroup } from "../components/parts.tsx";

// Same --auth-* visual language as Welcome/Onboarding (borrowed from App/'s
// login module) — this is the console's public entry point, so it should
// read as the same product as the consumer app before a visitor ever signs
// in. Console/ProfilePicker keep the console's own back-office design system.
export function Landing({
  D,
  locale,
  setLocale,
  onGetStarted,
  onSignIn,
  onLogoClick,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onGetStarted: () => void;
  onSignIn: () => void;
  onLogoClick: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--auth-bg)",
        backgroundImage: "radial-gradient(rgba(10,47,92,0.06) 1px, transparent 1.2px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-4) var(--space-6)", flexWrap: "wrap", rowGap: "var(--space-3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: "auto" }}>
          <PayRusLogo size={120} onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />
        </div>
        <SegGroup label={D.language} value={locale} onChange={setLocale} options={LOCALES.map((l) => ({ value: l.code, label: l.flag }))} />
        <button
          type="button"
          onClick={onSignIn}
          style={{ background: "none", border: 0, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--auth-navy)" }}
        >
          {D.landing.ctaSignIn}
        </button>
      </div>

      <div
        style={{
          padding: "var(--space-8) var(--space-6)",
          maxWidth: 1100,
          width: "100%",
          boxSizing: "border-box",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", alignItems: "flex-start", maxWidth: "40em" }}>
          <span
            style={{
              display: "inline-flex",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--auth-teal)",
              border: "1px solid var(--auth-border)",
              borderRadius: 999,
              padding: "4px 12px",
              background: "#fff",
            }}
          >
            {D.landing.kicker}
          </span>
          <h1 style={{ margin: 0, fontSize: 36, lineHeight: 1.15, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>
            {D.landing.title}
          </h1>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--auth-body)" }}>{D.landing.sub}</p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
            <button
              type="button"
              onClick={onGetStarted}
              style={{
                border: 0,
                borderRadius: 16,
                color: "#fff",
                fontFamily: "var(--font-auth-heading)",
                fontWeight: 700,
                fontSize: 15,
                padding: "13px 28px",
                cursor: "pointer",
                background: "var(--auth-gradient)",
                boxShadow: "0 10px 26px rgba(10,42,74,0.14)",
              }}
            >
              {D.landing.ctaStart}
            </button>
            <button
              type="button"
              onClick={onSignIn}
              style={{
                border: "1px solid var(--auth-border)",
                borderRadius: 16,
                background: "#fff",
                color: "var(--auth-navy)",
                fontFamily: "var(--font-auth-heading)",
                fontWeight: 700,
                fontSize: 15,
                padding: "13px 28px",
                cursor: "pointer",
              }}
            >
              {D.landing.ctaSignIn}
            </button>
          </div>
          <span style={{ marginTop: "var(--space-2)", fontSize: 12.5, fontWeight: 600, color: "var(--auth-muted)" }}>
            {D.landing.trustedBy}
          </span>
        </div>

        <div style={{ marginTop: "var(--space-8)" }}>
          <h2 style={{ margin: "0 0 var(--space-6)", fontSize: 22, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>
            {D.landing.featuresTitle}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "var(--space-4)" }}>
            {D.landing.features.map((f) => (
              <div
                key={f.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "var(--space-4)",
                  borderRadius: 16,
                  background: "#fff",
                  border: "1px solid var(--auth-border)",
                  boxShadow: "0 10px 26px rgba(10,42,74,0.06)",
                }}
              >
                <div style={{ fontFamily: "var(--font-auth-heading)", fontWeight: 700, fontSize: 16, color: "var(--auth-navy)" }}>{f.title}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--auth-body)" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ marginTop: "var(--space-8)", maxWidth: "44em", fontSize: 12.5, lineHeight: 1.6, color: "var(--auth-muted)" }}>
          {D.landing.footerNote}
        </p>
      </div>
    </div>
  );
}
