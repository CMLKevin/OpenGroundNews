"use client";

import { useEffect, useMemo, useState } from "react";
import { isStorySaved, toggleSavedStory } from "@/lib/localPrefs";

type CloudUser = { id: string; email: string; role: "user" | "admin" };

export function SaveStoryToggle({ storySlug }: { storySlug: string }) {
  const slug = useMemo(() => (storySlug || "").trim(), [storySlug]);
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const me = (await meRes.json()) as { user: CloudUser | null };
        if (!alive) return;
        if (!me?.user) {
          setCloudEnabled(false);
          setSaved(isStorySaved(slug));
          return;
        }
        setCloudEnabled(true);
        const res = await fetch("/api/saved", { cache: "no-store" });
        const json = (await res.json()) as any;
        if (!alive) return;
        const savedSlugs = Array.isArray(json?.saved)
          ? json.saved.map((s: any) => String(s.storySlug || s.story?.slug || "").trim()).filter(Boolean)
          : [];
        setSaved(new Set(savedSlugs).has(slug));
      } catch {
        setCloudEnabled(false);
        setSaved(isStorySaved(slug));
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (cloudEnabled) return;
      if (!slug) return;
      if (e.key === "ogn_saved_stories") setSaved(isStorySaved(slug));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [cloudEnabled, slug]);

  async function onToggle() {
    if (!slug || busy) return;
    setBusy(true);
    try {
      if (!cloudEnabled) {
        const next = toggleSavedStory(slug);
        setSaved(next);
        // Ensure same-tab updates in components that read the list.
        window.dispatchEvent(new StorageEvent("storage", { key: "ogn_saved_stories" } as any));
        return;
      }
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storySlug: slug }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed");
      const savedSlugs = Array.isArray(json?.savedSlugs) ? json.savedSlugs : [];
      setSaved(new Set(savedSlugs).has(slug));
    } catch {
      setCloudEnabled(false);
      const next = toggleSavedStory(slug);
      setSaved(next);
    } finally {
      setBusy(false);
    }
  }

  if (!slug) return null;

  return (
    <button className={`btn ${saved ? "btn-saved" : ""}`} type="button" onClick={onToggle} disabled={busy}>
      {saved ? "Saved" : "Save"}
    </button>
  );
}
