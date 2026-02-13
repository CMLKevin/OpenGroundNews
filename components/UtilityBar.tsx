import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";

function initials(email: string) {
  const handle = String(email || "").split("@")[0] || "";
  return (handle.slice(0, 2) || "OG").toUpperCase();
}

function UtilityIcon({ path }: { path: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={path} />
    </svg>
  );
}

function normalizeLocalLabel(value: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  return clean
    .replace(/\bU\.k\.\b/gi, "UK")
    .replace(/\bU\.s\.\b/gi, "US")
    .replace(/\bU\.a\.e\.\b/gi, "UAE");
}

export async function UtilityBar() {
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const cookieStore = await cookies();
  const guestLocalLabel = cookieStore.get("ogn_local_label")?.value || "";

  const user = await getCurrentUser();
  const prefs = user ? await db.userPrefs.findUnique({ where: { userId: user.id } }).catch(() => null) : null;
  const localLabel = normalizeLocalLabel(prefs?.localLabel || guestLocalLabel || "");

  return (
    <div className="topbar-utility">
      <div className="container topbar-utility-inner">
        <div className="utility-left">
          <span>See every side of every news story</span>
          <span className="utility-dot">•</span>
          <span>{todayLabel}</span>
          {localLabel ? (
            <>
              <span className="utility-dot">•</span>
              <span className="utility-loc utility-icon-label" title="Your selected location">
                <UtilityIcon path="M12 2a8 8 0 0 0-8 8c0 5.3 6.8 11.4 7.1 11.7a1.3 1.3 0 0 0 1.8 0C13.2 21.4 20 15.3 20 10a8 8 0 0 0-8-8zm0 10.5A2.5 2.5 0 1 1 14.5 10 2.5 2.5 0 0 1 12 12.5z" />
                {localLabel}
              </span>
            </>
          ) : null}
        </div>
        <div className="utility-right">
          {user ? (
            <Link href="/my" className="utility-avatar-link" aria-label="Open your profile">
              <span className="utility-avatar-circle" aria-hidden="true">{initials(user.email)}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
