"use client";

import { useEffect, useRef } from "react";
import { __GUEST_READING_KEY__ } from "@/components/MyNewsBiasWidget";

type Bias = { left: number; center: number; right: number };

type GuestEvent = {
  storySlug: string;
  readAt: string;
  dwellMs: number;
  bias: Bias;
};

function pushGuestEvent(ev: GuestEvent) {
  try {
    const raw = window.localStorage.getItem(__GUEST_READING_KEY__);
    const parsed = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? parsed : [];
    list.push(ev);
    const trimmed = list.slice(-500);
    window.localStorage.setItem(__GUEST_READING_KEY__, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export function ReadingTracker({ storySlug, bias }: { storySlug: string; bias: Bias }) {
  const startRef = useRef<number>(Date.now());
  const sentRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
    sentRef.current = false;

    return () => {
      const dwellMs = Math.max(0, Date.now() - startRef.current);
      const readAt = new Date().toISOString();

      if (!sentRef.current) {
        // Guest local history (always).
        pushGuestEvent({ storySlug, readAt, dwellMs, bias });

        // Signed-in server history (best-effort).
        fetch("/api/reading-events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ storySlug, dwellMs }),
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [storySlug, bias.left, bias.center, bias.right]);

  return null;
}

