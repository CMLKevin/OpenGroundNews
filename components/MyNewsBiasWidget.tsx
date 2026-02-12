"use client";

import { useEffect, useMemo, useState } from "react";

type Bias = { left: number; center: number; right: number };

type ApiBiasResponse = { ok: true; days: number; reads: number; bias: Bias } | { ok: false; error: string };

const GUEST_KEY = "ogn_reading_events_v1";

function normalizeTriplet(left: number, center: number, right: number): Bias {
  const total = left + center + right;
  if (total <= 0) return { left: 0, center: 0, right: 0 };
  const l = Math.round((left / total) * 100);
  const c = Math.round((center / total) * 100);
  const r = Math.max(0, 100 - l - c);
  return { left: l, center: c, right: r };
}

function readGuestEvents(): Array<{ bias?: Bias; dwellMs?: number; readAt?: string }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-500);
  } catch {
    return [];
  }
}

export function MyNewsBiasWidget() {
  const [signedIn, setSignedIn] = useState(false);
  const [data, setData] = useState<ApiBiasResponse | null>(null);
  const [guestReads, setGuestReads] = useState(0);
  const [guestBias, setGuestBias] = useState<Bias>({ left: 0, center: 0, right: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = (await meRes.json()) as { ok: boolean; user: any };
        if (!alive) return;
        if (!me?.user) {
          setSignedIn(false);
          setData(null);
          const events = readGuestEvents();
          let left = 0;
          let center = 0;
          let right = 0;
          for (const ev of events) {
            const b = ev.bias;
            if (!b) continue;
            const w = ev.dwellMs && ev.dwellMs > 0 ? Math.max(1, Math.min(10, Math.round(ev.dwellMs / 15000))) : 1;
            left += (b.left || 0) * w;
            center += (b.center || 0) * w;
            right += (b.right || 0) * w;
          }
          setGuestReads(events.length);
          setGuestBias(normalizeTriplet(left, center, right));
          return;
        }
        setSignedIn(true);
        const biasRes = await fetch("/api/me/bias?days=30", { cache: "no-store" });
        const json = (await biasRes.json()) as ApiBiasResponse;
        if (!alive) return;
        setData(json);
      } catch {
        if (!alive) return;
        setSignedIn(false);
        setData(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // For signed-in users we render server-backed bias; for guests we compute once on mount.
  const guestBiasMemo = useMemo(() => guestBias, [guestBias.left, guestBias.center, guestBias.right]);

  const bias = signedIn && data && (data as any).ok ? (data as any).bias : guestBiasMemo;
  const reads = signedIn && data && (data as any).ok ? (data as any).reads : guestReads;

  return (
    <section className="panel" style={{ display: "grid", gap: "0.6rem" }}>
      <div className="section-title" style={{ paddingTop: 0 }}>
        <h2 style={{ margin: 0 }}>My News Bias</h2>
        <span className="story-meta">{reads ? `${reads} read` : signedIn ? "No reads yet" : "Guest mode"}</span>
      </div>

      <div className="bias-mini">
        <div className="bias-mini-bar" aria-label="Your reading bias distribution">
          <div className="seg seg-left" style={{ width: `${bias.left}%` }} />
          <div className="seg seg-center" style={{ width: `${bias.center}%` }} />
          <div className="seg seg-right" style={{ width: `${bias.right}%` }} />
        </div>
        <div className="bias-mini-meta">
          <span className="bias-meta-left">{bias.left}% left</span>
          <span className="bias-meta-center">{bias.center}% center</span>
          <span className="bias-meta-right">{bias.right}% right</span>
        </div>
      </div>

      <p className="story-meta" style={{ margin: 0 }}>
        {signedIn ? "Based on your reading over the last 30 days." : "Based on reading on this device."}
      </p>
    </section>
  );
}

export const __GUEST_READING_KEY__ = GUEST_KEY;
