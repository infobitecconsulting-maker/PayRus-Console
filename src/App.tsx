import { useEffect, useRef, useState } from "react";
import type { Locale, Role } from "./types.ts";
import { DESK } from "./i18n.ts";
import { supabase } from "./lib/supabase-client.ts";
import { Landing } from "./screens/Landing.tsx";
import { Register } from "./screens/Register.tsx";
import { Welcome } from "./screens/Welcome.tsx";
import { ProfilePicker } from "./screens/ProfilePicker.tsx";
import { Console } from "./screens/Console.tsx";

type Stage = "landing" | "welcome" | "register" | "profile" | "app";

export default function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [, setHistory] = useState<Stage[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const settledRef = useRef(false);

  // The console has no router/callback route to land on after an
  // OAuth/SSO redirect — this is the single place that resolves a returning
  // Supabase session, mirroring App/src/pages/auth-callback/page.tsx's logic
  // but staying in the existing Stage state machine instead of a URL route.
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

    const resolve = (session: unknown) => {
      if (!session || settledRef.current) return;
      settledRef.current = true;
      setIsAuthenticated(true);
      setStage((s) => (s === "landing" || s === "welcome" ? "profile" : s));
    };

    void supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") resolve(session);
    });

    return () => subscription.subscription.unsubscribe();
    // Intentionally runs once on mount — this only ever needs to catch the
    // single redirect that may have landed on this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [profile, setProfile] = useState<Role>("Treasury");
  const [tabIx, setTabIx] = useState(0);
  const [rangeIx, setRangeIx] = useState(0);
  const [filterIx, setFilterIx] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");

  const D = DESK[locale];

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

  function pickRole(role: Role) {
    setProfile(role);
    setTabIx(0);
    setFilterIx(0);
    setIsAuthenticated(true);
    go("app");
  }

  function signOut() {
    setIsAuthenticated(false);
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
          onSignIn={() => {
            setIsAuthenticated(true);
            go("profile");
          }}
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
          onRegistered={() => {
            setIsAuthenticated(true);
            go("profile");
          }}
          onLogoClick={goToLogo}
        />
      )}

      {stage === "profile" && (
        <ProfilePicker D={D} onBack={goBack} onPick={pickRole} />
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
        />
      )}
    </div>
  );
}
