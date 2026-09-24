import { useCallback, useEffect, useState } from "react";
import type { Desk, Locale } from "../types.ts";
import { BackButton, LocaleMenu, PayRusLogo } from "../components/parts.tsx";
import {
  changePassword, exportMyData, getPreferredFxCurrency, listCurrencyCodes, listMyNotifications, listMyWalletsAndCards, loadFxSnapshot,
  loadMyProfile, markNotificationRead, setPreferredFxCurrency, signOutOtherDevices, updateMyProfile,
  type FxSnapshot, type MyCard, type MyNotification, type MyProfile, type MyWallet,
} from "../lib/account.ts";
import { clearLocation, getLocationFollow, setLocationFollow, syncLocation } from "../lib/location.ts";

type Section = "profile" | "security" | "notifications" | "appearance" | "payments" | "privacy" | "about";
const LANGUAGES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" }, { id: "fr", label: "Français" }, { id: "pt", label: "Português" }, { id: "es", label: "Español" },
];
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 2 : 4 });

// Console version of App/'s Settings menu (same seven sections). Everything
// here acts on the signed-in account's real data — no decorative toggles.
export function Settings({ D, locale, setLocale, userId, onBack, onLogoClick }: {
  D: Desk; locale: Locale; setLocale: (l: Locale) => void; userId: string | null; onBack: () => void; onLogoClick: () => void;
}) {
  const S = D.settings;
  const [section, setSection] = useState<Section>("profile");
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [notes, setNotes] = useState<MyNotification[] | null>(null);
  const [wallets, setWallets] = useState<MyWallet[] | null>(null);
  const [cards, setCards] = useState<MyCard[]>([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [fxCurrency, setFxCurrency] = useState<string>(getPreferredFxCurrency() ?? "");
  const [fx, setFx] = useState<FxSnapshot | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  const [follow, setFollow] = useState(getLocationFollow() === "on");

  const toggleFollow = async (on: boolean) => {
    setFollow(on);
    setLocationFollow(on ? "on" : "off");
    setMessage(null);
    try {
      if (on && userId) {
        const r = await syncLocation(userId);
        setMessage(r ? (r.changed ? S.locUpdated.replace("{country}", r.country).replace("{currency}", r.currency ?? "—") : S.locCountry.replace("{country}", r.country)) : S.locFailed);
      } else if (!on) {
        await clearLocation();
      }
      reload();
    } catch (e) {
      setMessage(e instanceof Error && e.message === "denied" ? S.locDenied : S.locFailed);
      if (e instanceof Error && e.message === "denied") { setFollow(false); setLocationFollow("off"); }
    }
  };

  useEffect(() => {
    if (!userId) return;
    void loadMyProfile(userId).then((p) => { setProfile(p); setName(p.name ?? ""); setPhone(p.phone ?? ""); }).catch(() => setProfile(null));
    void listMyNotifications(userId).then(setNotes).catch(() => setNotes([]));
    void listMyWalletsAndCards(userId).then((r) => { setWallets(r.wallets); setCards(r.cards); }).catch(() => setWallets([]));
  }, [userId, tick]);
  useEffect(() => { void listCurrencyCodes().then(setCodes).catch(() => setCodes([])); }, []);
  useEffect(() => { void loadFxSnapshot(userId).then(setFx).catch(() => setFx(null)); }, [userId, fxCurrency]);

  const fail = (e: unknown) => setMessage(e instanceof Error ? e.message : S.saveFailed);

  const saveProfile = async () => {
    setMessage(null);
    try { await updateMyProfile(name, phone); setMessage(S.saved); reload(); } catch (e) { fail(e); }
  };

  const savePassword = async () => {
    setMessage(null);
    if (pw.length < 8) { setMessage(S.passwordShort); return; }
    if (pw !== pw2) { setMessage(S.passwordMismatch); return; }
    try { await changePassword(pw); setPw(""); setPw2(""); setMessage(S.passwordUpdated); } catch (e) { fail(e); }
  };

  const download = async () => {
    if (!userId) return;
    try {
      const blob = new Blob([await exportMyData(userId)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "payrus-my-data.json";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { fail(e); }
  };

  const sections: { id: Section; label: string }[] = [
    { id: "profile", label: S.secProfile }, { id: "security", label: S.secSecurity }, { id: "notifications", label: S.secNotifications },
    { id: "appearance", label: S.secAppearance }, { id: "payments", label: S.secPayments }, { id: "privacy", label: S.secPrivacy }, { id: "about", label: S.secAbout },
  ];
  const row = (label: string, value: string | null) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: "1px solid var(--color-neutral-200, #E3E8EE)" }}>
      <span className="text-muted">{label}</span><strong style={{ textAlign: "right" }}>{value ?? S.notSet}</strong>
    </div>
  );

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

      <div style={{ flex: 1, padding: "var(--space-4) var(--space-6) var(--space-8)", maxWidth: 820, width: "100%", boxSizing: "border-box", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 4px" }}>{S.headline}</h1>
        <p className="text-muted" style={{ marginBottom: "var(--space-4)" }}>{S.subtitle}</p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: "var(--space-4)" }}>
          {sections.map((s) => (
            <button key={s.id} type="button" className={section === s.id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => { setSection(s.id); setMessage(null); }}>{s.label}</button>
          ))}
        </div>
        {message && <div className="tag tag-neutral" role="status" style={{ marginBottom: "var(--space-3)" }}>{message}</div>}

        {section === "profile" && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            {!profile && <div className="tag tag-neutral">{S.loading}</div>}
            {profile && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                  <div className="field"><label htmlFor="set-name">{S.name}</label><input id="set-name" className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="field"><label htmlFor="set-phone">{S.phone}</label><input id="set-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                <div><button type="button" className="btn btn-primary" onClick={() => void saveProfile()}>{S.save}</button></div>
                {row(S.email, profile.email)}{row(S.username, profile.username ? `@${profile.username}` : null)}
                {row(S.country, profile.country)}{row(S.currency, profile.defaultCurrency)}{row(S.kyc, profile.kycStatus)}
                {row(S.roles, profile.roles.map((r) => `${r.role.replace("_", " ")} (${r.status.replace("_", " ")})`).join(", ") || null)}
              </>
            )}
          </div>
        )}

        {section === "security" && (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{S.changePassword}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 8 }}>
                <div className="field"><label htmlFor="set-pw">{S.newPassword}</label><input id="set-pw" className="input" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
                <div className="field"><label htmlFor="set-pw2">{S.confirmPassword}</label><input id="set-pw2" className="input" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></div>
              </div>
              <div><button type="button" className="btn btn-primary" disabled={!pw} onClick={() => void savePassword()}>{S.updatePassword}</button></div>
            </div>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{S.signOutOthers}</div>
              <p className="card-body">{S.signOutOthersDesc}</p>
              <div><button type="button" className="btn btn-ghost" onClick={() => { setMessage(null); void signOutOtherDevices().then(() => setMessage(S.signedOutOthers)).catch(fail); }}>{S.signOutOthers}</button></div>
            </div>
          </div>
        )}

        {section === "notifications" && (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {notes === null && <div className="tag tag-neutral">{S.loading}</div>}
            {notes && notes.length === 0 && <div className="text-muted">{S.noNotifications}</div>}
            {notes?.map((n) => (
              <div key={n.id} className="card elev-sm" style={{ gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{n.title}{!n.read && <span className="tag tag-accent" style={{ marginLeft: 8 }}>{S.unread}</span>}</strong>
                  <span className="text-muted" style={{ fontSize: 12 }}>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <div>{n.body}</div>
                {!n.read && <div><button type="button" className="btn btn-ghost" onClick={() => void markNotificationRead(n.id).then(reload).catch(fail)}>{S.markRead}</button></div>}
              </div>
            ))}
          </div>
        )}

        {section === "appearance" && (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{S.languageLabel}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {LANGUAGES.map((l) => <button key={l.id} type="button" className={locale === l.id ? "btn btn-primary" : "btn btn-ghost"} onClick={() => setLocale(l.id)}>{l.label}</button>)}
              </div>
            </div>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{S.locTitle}</div>
              <p className="card-body">{S.locDesc}{profile?.locationCountry ? ` ${S.locCountry.replace("{country}", profile.locationCountry)}` : ""}</p>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={follow} onChange={(e) => void toggleFollow(e.target.checked)} /> {S.locTitle}
              </label>
            </div>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div className="card-title">{S.fxCurrencyLabel}</div>
              <p className="card-body">{S.fxCurrencyDesc}</p>
              <div className="field">
                <label htmlFor="set-fx">{S.fxCurrencyLabel}</label>
                <select id="set-fx" className="input" value={fxCurrency} onChange={(e) => { setFxCurrency(e.target.value); setPreferredFxCurrency(e.target.value || null); }}>
                  <option value="">{S.fxAuto}</option>
                  {codes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {section === "payments" && (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="card elev-sm" style={{ gap: 6 }}>
              <div className="card-title">{S.wallets}</div>
              {wallets === null && <div className="tag tag-neutral">{S.loading}</div>}
              {wallets && wallets.length === 0 && <div className="text-muted">{S.noWallets}</div>}
              {wallets?.map((w) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{w.provider ?? w.currency}</span><strong style={{ fontVariantNumeric: "tabular-nums" }}>{w.balance.toLocaleString()} {w.currency}</strong>
                </div>
              ))}
            </div>
            {cards.length > 0 && (
              <div className="card elev-sm" style={{ gap: 6 }}>
                <div className="card-title">{S.cards}</div>
                {cards.map((c) => <div key={c.id} style={{ display: "flex", justifyContent: "space-between" }}><span>{c.brand} •• {c.last4}</span><span className="text-muted">{c.type}{c.locked ? " · locked" : ""}</span></div>)}
              </div>
            )}
          </div>
        )}

        {section === "privacy" && (
          <div className="card elev-sm" style={{ gap: 8 }}>
            <div className="card-title">{S.exportData}</div>
            <p className="card-body">{S.exportDesc}</p>
            <div><button type="button" className="btn btn-primary" onClick={() => void download()}>{S.download}</button></div>
            <p className="text-muted" style={{ fontSize: 12 }}>{S.privacyNote}</p>
          </div>
        )}

        {section === "about" && (
          <div style={{ display: "grid", gap: "var(--space-4)" }}>
            <div className="card elev-sm" style={{ gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div className="card-title">{S.fxTickerTitle}{fx ? ` · ${fx.local}` : ""}</div>
                {fx?.updatedAt && <span className="text-muted" style={{ fontSize: 12 }}>{S.fxUpdated.replace("{time}", new Date(fx.updatedAt).toLocaleString())}</span>}
              </div>
              {!fx && <div className="tag tag-neutral">{S.loading}</div>}
              {fx && fx.pairs.length === 0 && <div className="text-muted">{S.fxUnavailable}</div>}
              {fx?.pairs.map((p) => <div key={p.code} style={{ display: "flex", justifyContent: "space-between" }}><span>1 {p.code}</span><strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmt(p.rate)} {fx.local}</strong></div>)}
              <div className="text-muted" style={{ fontSize: 11 }}>{S.fxAttribution}</div>
            </div>
            <div className="card elev-sm" style={{ gap: 4 }}>
              {row(S.version, "PayRus Ops")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
