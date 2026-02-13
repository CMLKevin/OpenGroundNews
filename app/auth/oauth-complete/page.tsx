"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeAppPath } from "@/lib/navigation";

export default function OAuthCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>("");
  const next = useMemo(() => safeAppPath(searchParams.get("next"), "/my"), [searchParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/oauth/sync", { method: "POST" });
        const json = (await res.json()) as { ok: boolean; error?: string };
        if (!alive) return;
        if (!json.ok) throw new Error(json.error || "OAuth sync failed");
        router.replace(next);
        router.refresh();
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "OAuth sync failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, [next, router]);

  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-06">
        <h1 className="u-m0">Completing sign-in</h1>
        <p className="story-meta u-m0">Finishing OAuth session bridge to your OpenGroundNews account...</p>
        {error ? <p className="note u-m0">{error}</p> : null}
      </section>
    </main>
  );
}
