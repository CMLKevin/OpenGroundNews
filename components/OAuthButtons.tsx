"use client";

import { useEffect, useMemo, useState } from "react";
import { getProviders, signIn } from "next-auth/react";
import { safeAppPath } from "@/lib/navigation";

export function OAuthButtons({ next }: { next: string }) {
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [error, setError] = useState<string>("");
  const callbackTarget = safeAppPath(next, "/my");
  const callback = useMemo(
    () => `/auth/oauth-complete?next=${encodeURIComponent(callbackTarget)}`,
    [callbackTarget],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const providers = await getProviders();
        if (!alive) return;
        setGoogleEnabled(Boolean(providers?.google));
      } catch {
        if (!alive) return;
        setGoogleEnabled(false);
      } finally {
        if (!alive) return;
        setLoadingProviders(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function onGoogleSignIn() {
    setError("");
    if (!googleEnabled) {
      setError("Google sign-in is unavailable right now. Check AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.");
      return;
    }
    try {
      await signIn("google", {
        callbackUrl: callback,
        prompt: "select_account",
      });
    } catch {
      setError("Google sign-in failed to start. Please try again.");
    }
  }

  return (
    <div className="auth-oauth-stack">
      <button
        className="btn auth-google-btn"
        type="button"
        onClick={() => void onGoogleSignIn()}
        disabled={loadingProviders || !googleEnabled}
      >
        <span className="auth-google-icon" aria-hidden="true">
          G
        </span>
        <span className="auth-google-copy">
          <span className="auth-google-title">Continue with Google</span>
          <span className="auth-google-subtitle">Sync follows, saved stories, and your For You feed</span>
        </span>
        <span className="auth-google-arrow" aria-hidden="true">
          -&gt;
        </span>
      </button>
      {loadingProviders ? <span className="story-meta auth-provider-status">Checking provider...</span> : null}
      {!loadingProviders && !googleEnabled ? (
        <span className="note auth-provider-error">Google OAuth is not configured on this deployment yet.</span>
      ) : null}
      {!loadingProviders && googleEnabled ? (
        <span className="story-meta auth-provider-status">No password required. Account created on first sign-in.</span>
      ) : null}
      {error ? <span className="note auth-provider-error">{error}</span> : null}
    </div>
  );
}
