import { useEffect, useRef, useState } from "react";
import type { Locale, Role } from "./types.ts";
import { DESK } from "./i18n.ts";
import { supabase } from "./lib/supabase-client.ts";
import { upsertSupabaseUser, listUserRoles, grantAdminRole } from "./lib/identity.ts";
import { dbRoleToConsoleRole, isAdminDbRole, loadRoleDefinitions } from "./lib/roleMapping.ts";
import { Landing } from "./screens/Landing.tsx";
import { Register } from "./screens/Register.tsx";
import { Welcome } from "./screens/Welcome.tsx";
import { ProfilePicker } from "./screens/ProfilePicker.tsx";
import { Kyc } from "./screens/Kyc.tsx";
import { Console } from "./screens/Console.tsx";
import { Config } from "./screens/Config.tsx";
import { Admin } from "./screens/Admin.tsx";
import { Settings } from "./screens/Settings.tsx";
import { getMyPermissions } from "./lib/adminStaff.ts";
import { RegisterCustomer } from "./screens/RegisterCustomer.tsx";
import Organisation from "./screens/Organisation.tsx";
import { Send } from "./screens/Send.tsx";
import { NewReceiver } from "./screens/NewReceiver.tsx";
import { Pickup } from "./screens/Pickup.tsx";
import { Partners } from "./screens/Partners.tsx";
import type { Recipient } from "./lib/p2p.ts";
import { myMemberships } from "./lib/org.ts";
import { needsMfaChallenge } from "./lib/mfa.ts";
import { MfaGate } from "./screens/MfaGate.tsx";
import { MfaStepUpHost, StaffMfaGate } from "./components/Mfa.tsx";

type Stage = "partners" | "newReceiver" | "pickup" | "mfa" | "send" | "organisation" | "landing" | "welcome" | "register" | "profile" | "kyc" | "app" | "config" | "admin" | "settings" | "registerCustomer";
type AuthSession = { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null;

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [, setHistory] = useState<Stage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  const settledRef = useRef(false);
  // Session that passed the password step but still owes a TOTP code (AAL1 -> AAL2).
  const mfaSessionRef = useRef<AuthSession>(null);

  const [profile, setProfile] = useState<Role>("Treasury");
  // Mirrors App/'s isAdmin bypass — App/'s "admin" user_roles.role has no
  // corresponding entry in this console's own Role vocabulary at all, so
  // it's tracked separately rather than folded into `profile` (see
  // lib/roleMapping.ts).
  const [isAdmin, setIsAdmin] = useState(false);
  // True when the account holds a staff role or admin tier (any read right).
  const [canAdminister, setCanAdminister] = useState(false);
  // Admin tier (admin or superadmin, from the database) unlocks Configuration.
  const [canConfigure, setCanConfigure] = useState(false);
  const [canOrganise, setCanOrganise] = useState(false);
  const [memberPreselect, setMemberPreselect] = useState<Recipient | null>(null);
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
    // PRS-IAM-003: an account with a verified TOTP factor must reach AAL2 before it is routed in.
    if (await needsMfaChallenge()) {
      mfaSessionRef.current = session;
      setStage("mfa");
      return;
    }
    if (settledRef.current) return;
    settledRef.current = true;
    setIsAuthenticated(true);
    try {
      const meta = session.user.user_metadata ?? {};
      const name = (typeof meta.full_name === "string" && meta.full_name) || (typeof meta.name === "string" && meta.name) || undefined;
      const { userId: resolvedUserId } = await upsertSupabaseUser({ supabaseUserId: session.user.id, email: session.user.email, name });
      setUserId(resolvedUserId);
      const roles = await listUserRoles(resolvedUserId);
      await loadRoleDefinitions();
      if (roles.length === 1) {
        setProfile(dbRoleToConsoleRole(roles[0].role));
        setIsAdmin(isAdminDbRole(roles[0].role));
        setTabIx(0);
        setFilterIx(0);
        setStage("app");
      } else {
        // Unconditional — previously gated on `stage === "landing" || "welcome"`,
        // which silently did nothing for the same-tab "just registered,
        // email confirmation off" path (stage is "register" at this exact
        // call time, not "landing"/"welcome"), leaving a freshly-
        // authenticated 0-role user stuck on the registration screen. The
        // settledRef guard above already makes this function run-once per
        // page load, so there's no risk of this clobbering a stage the user
        // has genuinely moved past since sign-in.
        setStage("profile");
      }
    } catch {
      setStage("profile");
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

  useEffect(() => {
    if (stage !== "app" || !isAuthenticated) return;
    void getMyPermissions()
      .then((p) => { setCanAdminister(p.isSuperadmin || p.users.read || p.transactions.read); setCanConfigure(p.isAdmin); })
      .catch(() => { setCanAdminister(false); setCanConfigure(false); });
    void Promise.all([getMyPermissions().catch(() => null), myMemberships().catch(() => [])])
      .then(([p, m]) => setCanOrganise(!!p?.isSuperadmin || m.some((x) => x.status === "active")));
  }, [stage, isAuthenticated, isAdmin, userId]);

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

  // Password-checked server-side (gate 'admin'); a wrong password throws and
  // the picker shows the error. Success = App/'s isAdmin bypass.
  async function pickAdmin(password: string) {
    if (!userId) throw new Error("not signed in");
    await grantAdminRole(userId, password);
    await loadRoleDefinitions();
    setProfile(dbRoleToConsoleRole("admin"));
    setIsAdmin(true);
    setTabIx(0);
    setFilterIx(0);
    setIsAuthenticated(true);
    go("app");
  }

  function completeKyc() {
    setIsAdmin(false);
    if (pendingRole) setProfile(pendingRole);
    setTabIx(0);
    setFilterIx(0);
    setIsAuthenticated(true);
    go("app");
  }

  function signOut() {
    // Unlike App/ (whose "logged in" gate is its own localUserId flag,
    // cleared explicitly on logout — see App/src/lib/local-user.ts), this
    // console's gate IS the live Supabase session: the mount-time effect
    // above calls getSession() and silently re-authenticates from it. Only
    // resetting local React state here would leave that session intact, so
    // reloading the page after "signing out" would log the user straight
    // back in.
    void supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserId(null);
    setIsAdmin(false);
    setCanAdminister(false);
    setCanConfigure(false);
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
      <MfaStepUpHost locale={locale} />
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
        <ProfilePicker D={D} onBack={goBack} onPick={pickRole} onPickAdmin={pickAdmin} />
      )}

      {stage === "mfa" && (
        <MfaGate
          D={D}
          locale={locale}
          setLocale={setLocale}
          onVerified={() => void resolveIdentityAndRoute(mfaSessionRef.current)}
          onCancel={() => { mfaSessionRef.current = null; void supabase.auth.signOut(); setStage("welcome"); }}
          onLogoClick={goToLogo}
        />
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
          isAdmin={isAdmin}
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
          canAdminister={canAdminister}
          canConfigure={canConfigure}
          onOpenAdmin={() => go("admin")}
          canOrganise={canOrganise}
          onOpenOrganisation={() => go("organisation")}
          onOpenSend={() => go("send")}
          onOpenPickup={() => go("pickup")}
          onOpenPartners={() => go("partners")}
          userId={userId}
          onOpenSettings={() => go("settings")}
          onOpenRegisterCustomer={() => go("registerCustomer")}
        />
      )}

      {stage === "settings" && (
        <Settings D={D} locale={locale} setLocale={setLocale} userId={userId} onBack={goBack} onLogoClick={goToLogo} />
      )}

      {stage === "admin" && (
        <StaffMfaGate locale={locale} onMessage={() => undefined}><Admin D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} /></StaffMfaGate>
      )}

      {stage === "newReceiver" && (
        <NewReceiver D={D} locale={locale} setLocale={setLocale} userId={userId} onBack={goBack} onLogoClick={goToLogo}
          onSendToMember={(m) => { setMemberPreselect(m); goBack(); }} />
      )}

      {stage === "partners" && (
        <Partners D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}

      {stage === "pickup" && (
        <Pickup D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}

      {stage === "send" && (
        <Send D={D} locale={locale} setLocale={setLocale} userId={userId} onBack={goBack} onLogoClick={goToLogo} onNewReceiver={() => go("newReceiver")} preselect={memberPreselect} />
      )}

      {stage === "organisation" && (
        <Organisation D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}

      {stage === "config" && (
        <StaffMfaGate locale={locale} onMessage={() => undefined}><Config D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} /></StaffMfaGate>
      )}

      {stage === "registerCustomer" && (
        <RegisterCustomer D={D} locale={locale} setLocale={setLocale} onBack={goBack} onLogoClick={goToLogo} />
      )}
    </div>
  );
}
