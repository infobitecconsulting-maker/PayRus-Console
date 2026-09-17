import { useEffect, useRef, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import { supabase } from "../lib/supabase-client.ts";
import { OAUTH_PROVIDERS, signInWithOAuthProvider, type OAuthProviderId } from "../lib/supabase-providers.ts";
import { COUNTRY_OPTIONS, callingCodeForCountry } from "../lib/geo.ts";
import { citiesForCountry, provincesForCountry } from "../lib/address.ts";
import { suggestPostalCodes, suggestStreets, type PostalCodeSuggestion } from "../lib/addressSuggestions.ts";

type Step = "details" | "checkEmail";

// Same field set and flow as App/src/pages/register/page.tsx (real
// supabase.auth.signUp, details → checkEmail, OAuth "quick sign-up" grid) —
// the console has no Convex backend to persist phone/address to, so those
// extra fields ride along in the Supabase user's metadata instead of being
// silently dropped, but identity creation itself is real, not simulated.
export function Register({
  D,
  locale,
  setLocale,
  onBack,
  onRegistered,
  onLogoClick,
}: {
  D: Desk;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onBack: () => void;
  onRegistered: (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => void;
  onLogoClick: () => void;
}) {
  const R = D.register;
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const autoFilledPhoneRef = useRef("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthPending, setOauthPending] = useState<OAuthProviderId | null>(null);
  const [ssoExpanded, setSsoExpanded] = useState(false);
  const [streetSuggestions, setStreetSuggestions] = useState<string[]>([]);
  const [streetSuggestOpen, setStreetSuggestOpen] = useState(false);
  const streetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [postalCodeSuggestions, setPostalCodeSuggestions] = useState<PostalCodeSuggestion[]>([]);
  const [postalCodeSuggestOpen, setPostalCodeSuggestOpen] = useState(false);
  const lastPostalLookupRef = useRef("");

  // AI-backed street autosuggest — same trigger conditions as App/'s
  // register page: only once country+city+province are all chosen, and only
  // after a short pause in typing (no `use-debounce` dependency here, so a
  // small manual debounce via a timeout ref).
  const handleStreetChange = (value: string) => {
    setStreet(value);
    if (streetDebounceRef.current) clearTimeout(streetDebounceRef.current);
    if (!country || !city.trim() || !province || value.trim().length < 2) {
      setStreetSuggestions([]);
      setStreetSuggestOpen(false);
      return;
    }
    streetDebounceRef.current = setTimeout(async () => {
      const suggestions = await suggestStreets({ country, city: city.trim(), province, query: value.trim() });
      setStreetSuggestions(suggestions);
      setStreetSuggestOpen(suggestions.length > 0);
    }, 400);
  };

  const handlePickStreetSuggestion = (streetName: string) => {
    setStreet(streetName);
    setStreetSuggestOpen(false);
  };

  // AI-backed postal-code autosuggest — fires automatically the moment
  // country+city+province are all chosen (no typing needed), and again if
  // city/province change afterwards. The ref guards against a stale in-flight
  // request from a since-changed combo clobbering a newer result.
  useEffect(() => {
    const trimmedCity = city.trim();
    if (!country || !trimmedCity || !province) {
      setPostalCodeSuggestions([]);
      setPostalCodeSuggestOpen(false);
      return;
    }
    const key = `${country}|${trimmedCity}|${province}`;
    if (lastPostalLookupRef.current === key) return;
    lastPostalLookupRef.current = key;
    void (async () => {
      const suggestions = await suggestPostalCodes({ country, city: trimmedCity, province });
      if (lastPostalLookupRef.current !== key) return;
      setPostalCodeSuggestions(suggestions);
      setPostalCodeSuggestOpen(suggestions.length > 0);
    })();
  }, [country, city, province]);

  const handlePickPostalCode = (suggestion: PostalCodeSuggestion) => {
    setPostalCode(suggestion.postalCode);
    setPostalCodeSuggestOpen(false);
  };

  const handleOAuthClick = async (provider: OAuthProviderId) => {
    setOauthPending(provider);
    setError(null);
    try {
      await signInWithOAuthProvider(provider);
    } catch {
      setError(R.saveFailed);
      setOauthPending(null);
    }
  };

  const handleSubmit = async () => {
    if (
      !firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !country ||
      !street.trim() || !houseNumber.trim() || !city.trim() || !province
    ) {
      setError(R.allFieldsRequired);
      return;
    }
    if (password.length < 6) {
      setError(R.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setError(R.passwordMismatch);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const trimmedEmail = email.trim();
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), country,
            street: street.trim(), houseNumber: houseNumber.trim(), city: city.trim(), province,
            postalCode: postalCode.trim() || undefined,
          },
        },
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      if (!data.user) {
        setError(R.saveFailed);
        return;
      }
      if (data.session) {
        // Email confirmation is off — Supabase already signed them in.
        onRegistered(data.session);
        return;
      }
      setStep("checkEmail");
    } catch {
      setError(R.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = { borderRadius: 12, borderColor: "var(--auth-border)" };
  const fieldWrap = (colSpan?: 2) => ({ display: "flex", flexDirection: "column" as const, gap: 5, gridColumn: colSpan ? "span 2" : undefined });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--auth-bg)",
        backgroundImage: "radial-gradient(rgba(10,47,92,0.06) 1px, transparent 1.2px)",
        backgroundSize: "16px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-4) var(--space-6)" }}>
        <BackButton label={D.back} onClick={() => (step === "checkEmail" ? setStep("details") : onBack())} />
        <LocaleMenu value={locale} onChange={setLocale} variant="auth" />
      </div>

      {step === "details" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-6)", padding: "0 var(--space-6) var(--space-8)", maxWidth: 520, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
          <PayRusLogo size={140} onClick={onLogoClick} alt={D.logoAlt} homeLabel={D.logoHomeLabel} />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>{R.headline}</h1>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--auth-body)" }}>{R.subtitle}</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", width: "100%" }}>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-firstname">{R.firstName}</label>
              <input className="input" id="reg-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={fieldStyle} />
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-lastname">{R.lastName}</label>
              <input className="input" id="reg-lastname" value={lastName} onChange={(e) => setLastName(e.target.value)} style={fieldStyle} />
            </div>
            <div style={fieldWrap(2)} className="field">
              <label htmlFor="reg-email">{R.email}</label>
              <input className="input" id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldStyle} />
            </div>
            <div style={fieldWrap(2)} className="field">
              <label htmlFor="reg-country">{R.country}</label>
              <select
                id="reg-country"
                value={country}
                onChange={(e) => {
                  const next = e.target.value;
                  setCountry(next);
                  setProvince("");
                  setCity("");
                  if (!phone.trim() || phone === autoFilledPhoneRef.current) {
                    const dial = callingCodeForCountry(next);
                    if (dial) {
                      const nextPhone = `+${dial} `;
                      setPhone(nextPhone);
                      autoFilledPhoneRef.current = nextPhone;
                    }
                  }
                }}
                className="input"
                style={fieldStyle}
              >
                <option value="" disabled>{R.countryPlaceholder}</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                ))}
              </select>
            </div>
            <div style={fieldWrap(2)} className="field">
              <label htmlFor="reg-phone">{R.phone}</label>
              <input
                className="input"
                id="reg-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  autoFilledPhoneRef.current = "";
                }}
                placeholder={country ? `+${callingCodeForCountry(country)} ...` : undefined}
                style={fieldStyle}
              />
            </div>
            <div style={{ ...fieldWrap(), position: "relative" }} className="field">
              <label htmlFor="reg-street">{R.street}</label>
              <input
                className="input"
                id="reg-street"
                value={street}
                onChange={(e) => handleStreetChange(e.target.value)}
                onFocus={() => setStreetSuggestOpen(streetSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setStreetSuggestOpen(false), 150)}
                autoComplete="off"
                style={fieldStyle}
              />
              {streetSuggestOpen && (
                <div
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 10,
                    background: "#fff", border: "1px solid var(--auth-border)", borderRadius: 10,
                    boxShadow: "0 10px 26px rgba(10,42,74,0.12)", overflow: "hidden",
                  }}
                >
                  {streetSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickStreetSuggestion(s)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 8,
                        background: "none", border: 0, padding: "8px 12px", cursor: "pointer", fontSize: 13, textAlign: "left",
                        color: "var(--auth-navy)",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-house-number">{R.houseNumber}</label>
              <input className="input" id="reg-house-number" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)} style={fieldStyle} />
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-city">{R.city}</label>
              {citiesForCountry(country).length > 0 ? (
                <select id="reg-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={!country} className="input" style={fieldStyle}>
                  <option value="" disabled>{R.cityPlaceholder}</option>
                  {citiesForCountry(country).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input className="input" id="reg-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={R.cityPlaceholder} style={fieldStyle} />
              )}
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-province">{R.province}</label>
              {provincesForCountry(country).length > 0 ? (
                <select id="reg-province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={!country} className="input" style={fieldStyle}>
                  <option value="" disabled>{R.provincePlaceholder}</option>
                  {provincesForCountry(country).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input className="input" id="reg-province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={!country} placeholder={R.provincePlaceholder} style={fieldStyle} />
              )}
            </div>
            <div style={{ ...fieldWrap(2), position: "relative" }} className="field">
              <label htmlFor="reg-postal-code">{R.postalCode}</label>
              <input
                className="input"
                id="reg-postal-code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                onFocus={() => setPostalCodeSuggestOpen(postalCodeSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setPostalCodeSuggestOpen(false), 150)}
                autoComplete="off"
                style={fieldStyle}
              />
              {postalCodeSuggestOpen && (
                <div
                  style={{
                    position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 10,
                    background: "#fff", border: "1px solid var(--auth-border)", borderRadius: 10,
                    boxShadow: "0 10px 26px rgba(10,42,74,0.12)", overflow: "hidden",
                  }}
                >
                  {postalCodeSuggestions.map((s) => (
                    <button
                      key={s.postalCode}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickPostalCode(s)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        background: "none", border: 0, padding: "8px 12px", cursor: "pointer", fontSize: 13, textAlign: "left",
                      }}
                    >
                      <span style={{ color: "var(--auth-navy)", fontWeight: 600 }}>{s.postalCode}</span>
                      {s.area && <span style={{ color: "var(--auth-body)", fontSize: 11 }}>{s.area}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-password">{R.password}</label>
              <input className="input" id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldStyle} />
            </div>
            <div style={fieldWrap()} className="field">
              <label htmlFor="reg-password-confirm">{R.confirmPassword}</label>
              <input className="input" id="reg-password-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={fieldStyle} />
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, alignSelf: "flex-start", fontSize: 12.5, color: "#C33F55", fontWeight: 600 }} role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            style={{
              width: "100%", border: 0, borderRadius: 16, color: "#fff", fontFamily: "var(--font-auth-heading)", fontWeight: 700,
              fontSize: 15, textAlign: "center", padding: "14px", cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              background: "var(--auth-gradient)", boxShadow: "0 10px 26px rgba(10,42,74,0.14)",
            }}
          >
            {saving ? D.checking : R.submit}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
            <div style={{ height: 1, flex: 1, background: "var(--auth-border)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--auth-muted)" }}>{D.orDivider}</span>
            <div style={{ height: 1, flex: 1, background: "var(--auth-border)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--auth-body)", textAlign: "center" }}>{R.ssoTitle}</span>
            <button
              type="button"
              onClick={() => setSsoExpanded((v) => !v)}
              style={{ borderRadius: 16, border: 0, background: "#EDF2F5", color: "var(--auth-navy)", fontWeight: 700, fontSize: 15, textAlign: "center", padding: "14px", cursor: "pointer", fontFamily: "var(--font-auth-heading)" }}
            >
              {R.ssoButton}
            </button>
            {ssoExpanded && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, paddingTop: 4 }}>
                {OAUTH_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={oauthPending !== null}
                    onClick={() => void handleOAuthClick(p.id)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: 0, cursor: oauthPending ? "default" : "pointer", opacity: oauthPending && oauthPending !== p.id ? 0.5 : 1 }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12, background: p.bg, border: "1px solid var(--auth-border)" }}>
                      {p.initial}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "var(--auth-body)" }}>{oauthPending === p.id ? D.checking : p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {step === "checkEmail" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "var(--space-6)", padding: "0 var(--space-6) var(--space-8)", maxWidth: 420, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 22, fontFamily: "var(--font-auth-heading)", fontWeight: 800, color: "var(--auth-navy)" }}>{R.checkEmailHeadline}</h1>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--auth-body)" }}>{R.checkEmailSubtitle.replace("%1", email.trim())}</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            style={{
              border: 0, borderRadius: 16, color: "#fff", fontFamily: "var(--font-auth-heading)", fontWeight: 700, fontSize: 15,
              textAlign: "center", padding: "14px 28px", cursor: "pointer", background: "var(--auth-gradient)", boxShadow: "0 10px 26px rgba(10,42,74,0.14)",
            }}
          >
            {R.backToSignin}
          </button>
        </div>
      )}
    </div>
  );
}
