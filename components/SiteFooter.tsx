import Link from "next/link";

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="footer-col">
      <div className="footer-col-title">{title}</div>
      <div className="footer-col-links">{children}</div>
    </div>
  );
}

export function SiteFooter() {
  const githubUrl = process.env.NEXT_PUBLIC_OGN_GITHUB_URL || "";
  const xUrl = process.env.NEXT_PUBLIC_OGN_X_URL || "";
  const supportEmail = process.env.NEXT_PUBLIC_OGN_SUPPORT_EMAIL || "";
  const iosUrl = process.env.NEXT_PUBLIC_OGN_IOS_URL || "";
  const androidUrl = process.env.NEXT_PUBLIC_OGN_ANDROID_URL || "";
  const hasSocialLinks = Boolean(githubUrl || xUrl || supportEmail);

  return (
    <footer className="site-footer" aria-label="Footer">
      <div className="container site-footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">OpenGroundNews</div>
          <p className="footer-tagline">
            See every side of every story, with open infrastructure and transparent ingestion.
          </p>
          {hasSocialLinks ? (
            <div className="footer-social">
              {githubUrl ? (
                <a className="footer-social-link" href={githubUrl} target="_blank" rel="noreferrer">
                  GitHub
                </a>
              ) : null}
              {xUrl ? (
                <a className="footer-social-link" href={xUrl} target="_blank" rel="noreferrer">
                  X
                </a>
              ) : null}
              {supportEmail ? (
                <a className="footer-social-link" href={`mailto:${supportEmail}`}>
                  Email
                </a>
              ) : null}
            </div>
          ) : (
            <p className="story-meta u-m0">
              Community links will appear here once they are configured.
            </p>
          )}
          {(iosUrl || androidUrl) ? (
            <div className="footer-social u-mt-06">
              {iosUrl ? (
                <a className="footer-social-link" href={iosUrl} target="_blank" rel="noreferrer">
                  App Store
                </a>
              ) : null}
              {androidUrl ? (
                <a className="footer-social-link" href={androidUrl} target="_blank" rel="noreferrer">
                  Google Play
                </a>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="footer-grid">
          <FooterCol title="About">
            <Link href="/rating-system">Rating system</Link>
            <Link href="/blindspot">Blindspot</Link>
            <Link href="/local">Local</Link>
            <Link href="/extension">Browser extension</Link>
          </FooterCol>

          <FooterCol title="Features">
            <Link href="/search">Search</Link>
            <Link href="/my">For You</Link>
            <Link href="/my-news-bias">My News Bias</Link>
            <Link href="/compare">Compare Sources</Link>
            <Link href="/calendar">Calendar</Link>
            <Link href="/maps">Maps</Link>
            <Link href="/newsletters">Newsletters</Link>
            <Link href="/get-started">Get started</Link>
            <Link href="/reader">Reader</Link>
          </FooterCol>

          <FooterCol title="Support">
            <Link href="/notifications">Notifications</Link>
            {supportEmail ? <a href={`mailto:${supportEmail}`}>Contact</a> : <Link href="/get-started">Get started</Link>}
          </FooterCol>

          <FooterCol title="Legal">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </FooterCol>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="container site-footer-bottom-inner">
          <span>OpenGroundNews</span>
          <span className="utility-dot" aria-hidden="true">•</span>
          <span>Open-source Ground News parity build</span>
          <span className="utility-dot" aria-hidden="true">•</span>
          <span>Remote-browser ingestion via Browser Use CDP</span>
        </div>
      </div>
    </footer>
  );
}
