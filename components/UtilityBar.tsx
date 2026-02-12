import Link from "next/link";

export function UtilityBar() {
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="topbar-utility">
      <div className="container topbar-utility-inner">
        <div className="utility-left">
          <span>See every side of every news story</span>
          <span className="utility-dot">•</span>
          <span>{todayLabel}</span>
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
