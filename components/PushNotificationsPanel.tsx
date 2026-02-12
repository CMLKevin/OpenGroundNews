"use client";

import { useEffect, useMemo, useState } from "react";

type Prefs = {
  notifyDailyBriefing: boolean;
  notifyBlindspot: boolean;
  notifyFollowed: boolean;
};

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) } });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

export function PushNotificationsPanel() {
  const [support, setSupport] = useState<{ sw: boolean; push: boolean }>({ sw: false, push: false });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const canEnable = useMemo(() => support.sw && support.push && Boolean(publicKey), [support, publicKey]);

  useEffect(() => {
    setSupport({ sw: "serviceWorker" in navigator, push: "PushManager" in window });
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
    fetch("/api/push/public-key", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const j = (await res.json()) as any;
        return typeof j.publicKey === "string" ? j.publicKey : null;
      })
      .then((key) => setPublicKey(key))
      .catch(() => setPublicKey(null));

    fetch("/api/me/prefs", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        const j = (await res.json()) as any;
        const p = j?.prefs || {};
        return {
          notifyDailyBriefing: Boolean(p.notifyDailyBriefing),
          notifyBlindspot: Boolean(p.notifyBlindspot),
          notifyFollowed: Boolean(p.notifyFollowed),
        } as Prefs;
      })
      .then((p) => setPrefs(p))
      .catch(() => setPrefs(null));
  }, []);

  async function ensureRegistration() {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) return reg;
    return navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }

  async function enable() {
    setStatus("");
    try {
      if (!canEnable) throw new Error("Notifications are not available (missing browser support or server keys).");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permission denied.");

      const reg = await ensureRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey!),
      });

      await fetchJson<{ ok: true }>("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });

      setStatus("Enabled on this device.");
      // Default: enable Daily Briefing if nothing is set yet.
      if (prefs && !prefs.notifyDailyBriefing && !prefs.notifyBlindspot && !prefs.notifyFollowed) {
        const updated = await fetchJson<any>("/api/me/prefs", {
          method: "POST",
          body: JSON.stringify({ notifyDailyBriefing: true }),
        });
        setPrefs({
          notifyDailyBriefing: Boolean(updated?.prefs?.notifyDailyBriefing),
          notifyBlindspot: Boolean(updated?.prefs?.notifyBlindspot),
          notifyFollowed: Boolean(updated?.prefs?.notifyFollowed),
        });
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to enable notifications.");
    }
  }

  async function disable() {
    setStatus("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) {
        setStatus("No active subscription found on this device.");
        return;
      }

      await fetchJson<{ ok: true }>("/api/push/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
      setStatus("Disabled on this device.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to disable notifications.");
    }
  }

  async function togglePref(key: keyof Prefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      const updated = await fetchJson<any>("/api/me/prefs", {
        method: "POST",
        body: JSON.stringify({ [key]: next[key] }),
      });
      setPrefs({
        notifyDailyBriefing: Boolean(updated?.prefs?.notifyDailyBriefing),
        notifyBlindspot: Boolean(updated?.prefs?.notifyBlindspot),
        notifyFollowed: Boolean(updated?.prefs?.notifyFollowed),
      });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to save preferences.");
    }
  }

  return (
    <section className="panel u-grid u-grid-gap-085">
      <div className="section-title u-pt-0">
        <h1 className="u-m0 u-font-serif">Notifications</h1>
        <span className="story-meta">
          {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked" : "Off"}
        </span>
      </div>

      <p className="u-m0 u-maxw-75ch">
        Turn on notifications to get Daily Briefing reminders, Blindspot alerts, and spikes from your followed topics and
        sources.
      </p>

      <div className="kpi-strip u-grid-cols-3">
        <div className="kpi">
          <span>Service Worker</span>
          <strong>{support.sw ? "Supported" : "No"}</strong>
        </div>
        <div className="kpi">
          <span>Push API</span>
          <strong>{support.push ? "Supported" : "No"}</strong>
        </div>
        <div className="kpi">
          <span>Server Keys</span>
          <strong>{publicKey ? "Configured" : "Missing"}</strong>
        </div>
      </div>

      <div className="chip-row">
        <button className="btn" onClick={enable} disabled={!canEnable}>
          Enable on this device
        </button>
        <button className="btn btn-secondary" onClick={disable} disabled={!support.sw}>
          Disable on this device
        </button>
      </div>

      {prefs ? (
        <div className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Alert Types</h2>
            <span className="story-meta">Account</span>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={prefs.notifyDailyBriefing} onChange={() => togglePref("notifyDailyBriefing")} />
            <span>Daily Briefing</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={prefs.notifyBlindspot} onChange={() => togglePref("notifyBlindspot")} />
            <span>Blindspot Report</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={prefs.notifyFollowed} onChange={() => togglePref("notifyFollowed")} />
            <span>Followed topics and sources</span>
          </label>
          <p className="story-meta u-m0">
            Tip: enabling an alert type doesn’t automatically enable push on every device. Click “Enable on this device”
            on each browser you use.
          </p>
        </div>
      ) : (
        <p className="note u-m0">
          Sign in to manage your notification preferences.
        </p>
      )}

      {status ? <p className="note u-m0">{status}</p> : null}
    </section>
  );
}

