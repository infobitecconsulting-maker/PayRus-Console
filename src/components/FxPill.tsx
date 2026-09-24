import { useEffect, useState } from "react";
import type { SettingsCopy } from "../types.ts";
import { loadFxSnapshot, type FxSnapshot } from "../lib/account.ts";

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: n >= 100 ? 2 : 4 });

// Live FX for the header: the signed-in user's currency vs USD and EUR.
export function FxPill({ S, userId }: { S: SettingsCopy; userId: string | null }) {
  const [snap, setSnap] = useState<FxSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      loadFxSnapshot(userId).then((s) => { if (!cancelled) { setSnap(s); setFailed(false); } }).catch(() => { if (!cancelled) setFailed(true); });
    };
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    window.addEventListener("payrus-fx-currency", load);
    return () => { cancelled = true; window.clearInterval(timer); window.removeEventListener("payrus-fx-currency", load); };
  }, [userId]);

  const title = snap?.updatedAt ? S.fxTitle.replace("{time}", new Date(snap.updatedAt).toLocaleString()) : S.fxTitleNoTime;

  return (
    <span className="tag tag-neutral" style={{ whiteSpace: "nowrap", display: "inline-flex", gap: 8, alignItems: "center" }} title={title} aria-label={title}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "#D98A00" }} />
      <strong>{S.fxLive}</strong>
      {!snap && !failed && <span>…</span>}
      {(failed || (snap && snap.pairs.length === 0)) && <span>{S.fxUnavailable}</span>}
      {snap?.pairs.map((p) => <span key={p.code} style={{ fontVariantNumeric: "tabular-nums" }}>1 {p.code} = {fmt(p.rate)} {snap.local}</span>)}
    </span>
  );
}
