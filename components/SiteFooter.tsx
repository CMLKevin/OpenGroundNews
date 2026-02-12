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
  return (
    <footer className="site-footer" aria-label="Footer">
      <div className="container site-footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">OpenGroundNews</div>
          <p className="footer-tagline">
            See every side of every story, with open infrastructure and transparent ingestion.
          </p>
          <div className="footer-social">
            <a className="footer-social-link" href="https://github.com" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="footer-social-link" href="https://x.com" target="_blank" rel="noreferrer">
              X
            </a>
            <a className="footer-social-link" href="mailto:hello@opengroundnews.local">
              Email
            </a>
          </div>
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
            <Link href="/get-started">Get started</Link>
            <Link href="/reader">Reader</Link>
          </FooterCol>

          <FooterCol title="Support">
            <Link href="/subscribe">Subscribe</Link>
            <Link href="/notifications">Notifications</Link>
            <a href="mailto:hello@opengroundnews.local">Contact</a>
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

