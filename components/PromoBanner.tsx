import Link from "next/link";

export function PromoBanner() {
  return (
    <div className="promo-banner" role="region" aria-label="Get started banner">
      <div className="container promo-banner-inner">
        <div className="promo-banner-copy">
          <strong>Ground-level coverage comparison</strong>
          <span className="promo-banner-sub">Build your feed, track your bias, and catch blindspots.</span>
        </div>
        <div className="promo-banner-actions">
          <Link className="btn promo-banner-btn" href="/get-started">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}

