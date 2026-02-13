"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { OAuthButtons } from "@/components/OAuthButtons";
import { safeAppPath } from "@/lib/navigation";

type Mode = "login" | "signup";

const BITMAP_ROWS = [
  "000111222333000",
  "001122333444100",
  "012233444554210",
  "123344555665321",
  "123455666665321",
  "123455666665321",
  "012344555554210",
  "001233444443100",
  "000122333321000",
] as const;

const BITMAP_TILES = BITMAP_ROWS.join("").split("");

export function AuthForm({ mode }: { mode: Mode }) {
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => safeAppPath(searchParams.get("next"), "/my"), [searchParams]);

  return (
    <section className="panel auth-shell auth-shell-oauth auth-halftone u-grid u-grid-gap-08">
      <div className="auth-topline">
        <span className="auth-kicker">OpenGroundNews Account</span>
        <h1 className="u-m0 u-font-serif">
          {mode === "signup" ? "Create your account with Google" : "Sign in with Google"}
        </h1>
        <p className="auth-lede u-m0">
          {mode === "signup"
            ? "One-click setup. Your follows, custom feeds, and reading history sync instantly."
            : "Drop into your personalized feed in one tap. No password friction."}
        </p>
      </div>

      <div className="auth-bitmap-stage" aria-hidden="true">
        <div className="auth-bitmap-grid">
          {BITMAP_TILES.map((tone, idx) => (
            <span key={`px-${idx}`} className={`auth-pixel tone-${tone}`} />
          ))}
        </div>
        <div className="auth-bitmap-caption">Perspective Radar // Live</div>
      </div>

      <div className="auth-terminal-strip" aria-hidden="true">
        FEED-LINK :: BIAS-RADAR :: SIGNAL STABLE :: MODE PERSONALIZED
      </div>

      <div className="auth-google-panel">
        <OAuthButtons next={redirectTo} />
      </div>

      <p className="story-meta u-m0">
        By continuing, you agree to the Terms and acknowledge the Privacy Policy.
        {" "}
        <Link href="/terms">Terms</Link> • <Link href="/privacy">Privacy</Link>
      </p>
    </section>
  );
}
