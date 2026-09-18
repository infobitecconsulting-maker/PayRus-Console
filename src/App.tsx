import { useEffect, useRef, useState } from "react";
import type { Locale, Role } from "./types.ts";
import { DESK } from "./i18n.ts";
import { supabase } from "./lib/supabase-client.ts";
import { upsertSupabaseUser, listUserRoles } from "./lib/identity.ts";
import { dbRoleToConsoleRole } from "./lib/roleMapping.ts";
import { Landing } from "./screens/Landing.tsx";
import { Register } from "./screens/Register.tsx";
import { Welcome } from "./screens/Welcome.tsx";
import { ProfilePicker } from "./screens/ProfilePicker.tsx";
import { Kyc } from "./screens/Kyc.tsx";
import { Console } from "./screens/Console.tsx";
import { Config } from "./screens/Config.tsx";
import { RegisterCustomer } from "./screens/RegisterCustomer.tsx";

type Stage = "landing" | "welcome" | "register" | "profile" | "kyc" | "app" | "config" | "registerCustomer";
type AuthSession = { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null;

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [, setHistory] = useState<Stage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const settledRef = useRef(false);

  const [profile, setProfile] = useState<Role>("Treasury");
  const [tabIx, setTabIx] = useState(0);
  const [rangeIx, setRangeIx] = useState(0);
  const [filterIx, setFilterIx] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");

  const D = DESK[locale];

  // The single place any successful sign-in (password, magic link, OAuth,
  // SSO, or a fresh registration) resolves into: create/find the real
  // Postgres user row, then route based on real role data — straight into
  // the account if exactly one role already exists (the "into his account"
  // case), to the profile picker otherwise (0 or 2+ roles). Mirrors
  // App/src/pages/auth-callback/page.tsx's routeAfterIdentity logic; ops-
  // console has no dedicated callback route, so this same function is
  // called both passively (the mount-time effect below, for magic-link/
  // OAuth/SSO redirects) and explicitly (Welcome/Register's own success
  // handlers, for password sign-in and fresh sign-up).
  const resolveIdentityAndRoute = async (session: AuthSession) => {
    if (!session?.user?.email || settledRef.current) return;
    settledRef.current = true;
    setIsAuthenticated(true);
    try {
      const meta = session.user.user_metadata ?? {};
      const name = (typeof meta.full_name === "string" && meta.full_name) || (typeof meta.name === "string" && meta.name) || undefined;
      const { userId: resolvedUserId } = await upsertSupabaseUser({ supabaseUserId: session.user.id, email: session.user.email, name });
      setUserId(resolvedUserId);
      const roles = await listUserRoles(resolvedUserId);
      if (roles.length === 1) {
        setProfile(dbRoleToConsoleRole(roles[0].role));
        setTabIx(0);
        setFilterIx(0);
        setStage("app");
      } else {
        setStage((s) => (s === "landing" || s === "welcome" ? "profile" : s));
      }
    } catch {
      setStage((s) => (s === "landing" || s === "welcome" ? "profile" : s));
    }
  };

  // The console has no router/callback route to land on after an
  // OAuth/SSO/magic-link redirect — this is the single place that resolves
  // a returning Supabase session on page load.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription =
      params.get("error_description") || hashParams.get("error_description") ||
      params.get("error") || hashParams.get("error");
    if (errorDescription) {
      setSsoError(errorDescription);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => resolveIdentityAndRoute(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") void resolveIdentityAndRoute(session);
    });

    return () => subscription.subscription.unsubscribe();
    // Intentionally runs once on mount — this only ever needs to catch the
    // single redirect that may have landed on this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(next: Stage) {
    setHistory((h) => [...h, stage]);
    setStage(next);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) {
        setStage("landing");
        return h;
      }
      const copy = [...h];
      const prev = copy.pop()!;
      setStage(prev);
      return copy;
    });
  }

  // Role picked but not yet verified — KYC comes next, not straight into the
  // dashboard (mirrors App/'s "pick a role, then complete its KYC wizard"
  // order in src/pages/profile/page.tsx).
  function pickRole(role: Role) {
    setPendingRole(role);
    go("kyc");
  }

  function completeKyc() {
    if (pendingRole) setProfile(pendingRole);
    setTabIx(0);
    setFilterIx(0);
    setIsAuthenticated(true);
    go("app");
  }

  function signOut() {
    setIsAuthenticated(false);
    setUserId(null);
    setPendingRole(null);
    settledRef.current = false;
    setHistory([]);
    setStage("landing");
    setTabIx(0);
    setFilterIx(0);
  }

  // Top-left logo: home for a signed-in user, the sign-in screen for anyone else.
  function goToLogo() {
    if (isAuthenticated) {
      setTabIx(0);
      setRangeIx(0);
      setFilterIx(0);
      if (stage !== "app") go("app");
    } else if (stage !== "welcome") {
      go("welcome");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      {stage === "landing" && (
        <Landing
          D={D}
          locale={locale}
          setLocale={setLocale}
          onGetStarted={() => go("register")}
          onSignIn={() => go("welcome")}
          onLogoClick={goToLogo}
        />
      )}

      {stage === "welcome" && (
        <Welcome
          D={D}
          locale={locale}
          setLocale={setLocale}
          onBack={goBack}
          onSignIn={(session) => void resolveIdentityAndRoute(session)}
          onRegister={() => go("register")}
          onLogoClick={goToLogo}
          ssoError={ssoError}
        />
      )}

      {stage === "register" && (
        <Register
          D={D}
          locale={locale}
          setLocale={setLocale}
          onBack={goBack}
          onRegistered={(session) => void resolveIdentityAndRoute(session)}
          onLogoClick={goToLogo}
        />
      )}

      {stage === "profile" && (
        <ProfilePicker D={D} onBack={goBack} onPick={pickRole} />
      )}

      {stage === "kyc" && pendingRole && (
        <Kyc
          D={D}
          locale={locale}
          setLocale={setLocale}
          role={pendingRole}
          userId={userId}
          onBack={goBack}
          onComplete={completeKyc}
          onLogoClick={goToLogo}
        />
      )}

      {stage === "app" && (
        <Console
          D={D}
          locale={locale}
          setLocale={setLocale}
          profile={profile}
          tabIx={tabIx}
          setTabIx={setTabIx}
          rangeIx={rangeIx}
          setRangeIx={setRangeIx}
          filterIx={filterIx}
          setFilterIx={setFilterIx}
          onBack={goBack}
          onSwitchProfile={() => go("profile")}
          onSignOut={signOut}
          onLogoClick={goToLogo}
          onOpenConfig={() => go("config")}
          onOpenRegisterCustomer={() => go("registerCustomer")}
        />
      )}

      {stage === "config" && (
        <Config D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}

      {stage === "registerCustomer" && (
        <RegisterCustomer D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}
    </div>
  );
}
