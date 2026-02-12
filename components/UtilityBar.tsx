import Link from "next/link";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";

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
  const localLabel = (prefs?.localLabel || guestLocalLabel || "").trim();

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
              <span className="utility-loc" title="Your selected location">
                {localLabel}
              </span>
            </>
          ) : null}
        </div>
        <div className="utility-right">
          <Link href="/rating-system">Methodology</Link>
          <span className="utility-dot">•</span>
          <Link href="/subscribe">Plans</Link>
          <span className="utility-dot">•</span>
          <Link href="/get-started">Get started</Link>
          <span className="utility-dot">•</span>
          <Link href="/extension">Extension</Link>
          <span className="utility-dot">•</span>
          <Link href="/notifications">Notifications</Link>
        </div>
      </div>
    </div>
  );
}
