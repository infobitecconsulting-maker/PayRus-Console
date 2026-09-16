import { supabase } from "./supabase-client.ts";

// Mirrors App/src/lib/supabase-providers.ts — the button click just
// redirects the whole page to the provider and back; there's no dedicated
// callback route here (the console has no router), so App.tsx's
// session-on-mount effect is what actually resolves the returning session.
export type OAuthProviderId = "google" | "facebook" | "github" | "apple" | "azure";

export const OAUTH_PROVIDERS: { id: OAuthProviderId; label: string; initial: string; bg: string }[] = [
  { id: "google", label: "Google", initial: "G", bg: "#EA4335" },
  { id: "facebook", label: "Facebook", initial: "f", bg: "#1877F2" },
  { id: "github", label: "GitHub", initial: "H", bg: "#181717" },
  { id: "apple", label: "Apple", initial: "A", bg: "#000000" },
  { id: "azure", label: "Microsoft", initial: "M", bg: "#0078D4" },
];

export async function signInWithOAuthProvider(provider: OAuthProviderId): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
