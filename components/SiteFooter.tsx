import Link from "next/link";
import { cookies } from "next/headers";
import { DEFAULT_EDITION, EDITIONS } from "@/lib/constants";

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="footer-col">
      <div className="footer-col-title">{title}</div>
      <div className="footer-col-links">{children}</div>
    </div>
  );
}

function SocialIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d={path} />
    </svg>
  );
}

export async function SiteFooter() {
  const cookieStore = await cookies();
  const editionFromCookie = cookieStore.get("ogn_edition")?.value || "";
  const selectedEdition = EDITIONS.includes(editionFromCookie as (typeof EDITIONS)[number])
    ? editionFromCookie
    : DEFAULT_EDITION;
  const social = {
    facebook: process.env.NEXT_PUBLIC_OGN_FACEBOOK_URL || "https://facebook.com",
    x: process.env.NEXT_PUBLIC_OGN_X_URL || "https://x.com",
    instagram: process.env.NEXT_PUBLIC_OGN_INSTAGRAM_URL || "https://instagram.com",
    linkedin: process.env.NEXT_PUBLIC_OGN_LINKEDIN_URL || "https://linkedin.com",
    reddit: process.env.NEXT_PUBLIC_OGN_REDDIT_URL || "https://reddit.com",
  };

  const iosUrl = process.env.NEXT_PUBLIC_OGN_IOS_URL || "#";
  const androidUrl = process.env.NEXT_PUBLIC_OGN_ANDROID_URL || "#";
  const bottomLinks = [
    { label: "Gift", href: "/subscribe?gift=1" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Manage Cookies", href: "/privacy#cookies" },
    { label: "Privacy Preferences", href: "/privacy#preferences" },
    { label: "Terms and Conditions", href: "/terms" },
  ] as const;

  const topicColumns = [
    {
      title: "News",
      links: [
        ["Politics", "/interest/politics"],
        ["US News", "/interest/us-news"],
        ["World", "/interest/world"],
        ["Business", "/interest/business"],
        ["Technology", "/interest/technology"],
      ],
    },
    {
      title: "International",
      links: [
        ["Europe", "/search?q=Europe"],
        ["Middle East", "/search?q=Middle+East"],
        ["Asia", "/search?q=Asia"],
        ["United Kingdom", "/search?q=United+Kingdom"],
        ["Canada", "/search?q=Canada"],
      ],
    },
    {
      title: "Trending",
      links: [
        ["Artificial Intelligence", "/interest/artificial-intelligence"],
        ["Health & Medicine", "/interest/health-and-medicine"],
        ["Business & Markets", "/interest/business-and-markets"],
        ["Climate", "/interest/climate"],
        ["Entertainment", "/interest/entertainment"],
      ],
    },
    {
      title: "Tools",
      links: [
        ["Blindspot", "/blindspot"],
        ["Compare", "/compare"],
        ["Maps", "/maps"],
        ["Calendar", "/calendar"],
        ["Search", "/search"],
      ],
    },
    {
      title: "Community",
      links: [
        ["Newsletters", "/newsletters"],
        ["Extension", "/extension"],
        ["Methodology", "/about/methodology"],
        ["Help", "/help"],
        ["Testimonials", "/testimonials"],
      ],
    },
  ];

  return (
    <footer className="site-footer" aria-label="Footer">
      <div className="container site-footer-inner">
        <div className="footer-topics-grid">
          {topicColumns.map((column) => (
            <div className="footer-topics-col" key={column.title}>
              <div className="footer-col-title">{column.title}</div>
              <div className="footer-col-links">
                {column.links.map(([label, href]) => (
                  <Link key={`${column.title}-${href}`} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-brand">
          <div className="footer-logo">OpenGroundNews</div>
          <p className="footer-tagline">See every side of every story, with open infrastructure and transparent ingestion.</p>
          <div className="footer-social" aria-label="Social media links">
            <a className="footer-social-link footer-social-icon" href={social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
              <SocialIcon path="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.3-1.5 1.6-1.5h1.7V5c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H7v3h2.6v8h3.9z" />
            </a>
            <a className="footer-social-link footer-social-icon" href={social.x} target="_blank" rel="noreferrer" aria-label="X">
              <SocialIcon path="M18.9 2H22l-6.8 7.8L22.8 22h-6.3l-5-6.5L5.9 22H2.8l7.3-8.4L1.2 2H7.7l4.5 5.8L18.9 2z" />
            </a>
            <a className="footer-social-link footer-social-icon" href={social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <SocialIcon path="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.8A5.2 5.2 0 1 1 6.8 13 5.2 5.2 0 0 1 12 7.8zm0 2A3.2 3.2 0 1 0 15.2 13 3.2 3.2 0 0 0 12 9.8zm5.4-3.2a1.2 1.2 0 1 1-1.2 1.2 1.2 1.2 0 0 1 1.2-1.2z" />
            </a>
            <a className="footer-social-link footer-social-icon" href={social.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <SocialIcon path="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.7h.1c.5-1 1.9-2 3.9-2 4.2 0 5 2.8 5 6.5V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4V9z" />
            </a>
            <a className="footer-social-link footer-social-icon" href={social.reddit} target="_blank" rel="noreferrer" aria-label="Reddit">
              <SocialIcon path="M22 12c0-1.1-.9-2-2-2-.6 0-1.2.3-1.6.7-1.4-1-3.3-1.6-5.4-1.7l1-4.1 2.9.7c.1.9.9 1.7 1.9 1.7 1.1 0 2-0.9 2-2s-.9-2-2-2c-.8 0-1.5.5-1.8 1.2l-3.6-.9c-.5-.1-1 .2-1.1.7l-1.2 4.9c-2.1.1-4 .7-5.4 1.7-.4-.4-1-.7-1.6-.7-1.1 0-2 .9-2 2 0 .8.5 1.5 1.2 1.8-.1.3-.2.7-.2 1.1 0 3 3.6 5.5 8 5.5s8-2.5 8-5.5c0-.4-.1-.8-.2-1.1.7-.3 1.2-1 1.2-1.8z" />
            </a>
          </div>

          <div className="footer-store-badges">
            <a className="footer-store-badge" href={iosUrl} target="_blank" rel="noreferrer" aria-label="Download on the App Store">
              <span className="footer-store-badge-small">Download on the</span>
              <span className="footer-store-badge-large">App Store</span>
            </a>
            <a className="footer-store-badge" href={androidUrl} target="_blank" rel="noreferrer" aria-label="Get it on Google Play">
              <span className="footer-store-badge-small">Get it on</span>
              <span className="footer-store-badge-large">Google Play</span>
            </a>
          </div>
        </div>

        <div className="footer-grid">
          <FooterCol title="Company">
            <Link href="/about/methodology">About OpenGroundNews</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/testimonials">Testimonials</Link>
            <Link href="/get-started">Get Started</Link>
            <Link href="/my-news-bias">My News Bias</Link>
            <Link href="/my/custom-feeds">Custom Feeds</Link>
            <Link href="/my/citations">Citations</Link>
            <Link href="/admin">Data Pipeline</Link>
          </FooterCol>

          <FooterCol title="Help">
            <Link href="/help">Help Center</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/notifications">Notifications</Link>
            <Link href="/forgot-password">Forgot Password</Link>
            <Link href="/reset-password">Reset Password</Link>
            <Link href="/search">Search Tips</Link>
            <Link href="/about/methodology">Editorial Methodology</Link>
          </FooterCol>

          <FooterCol title="Products">
            <Link href="/blindspot">Blindspot Feed</Link>
            <Link href="/local">Local Coverage</Link>
            <Link href="/compare">Compare Framing</Link>
            <Link href="/maps">Story Maps</Link>
            <Link href="/calendar">News Calendar</Link>
            <Link href="/extension">Browser Extension</Link>
            <Link href="/reader">Reader Mode</Link>
            <Link href="/subscribe">Subscribe</Link>
          </FooterCol>

          <FooterCol title="Tools">
            <Link href="/blindspot/about">Blindspot About</Link>
            <Link href="/newsletters/blindspot-report">Blindspot Report</Link>
            <Link href="/newsletters/burst-your-bubble">Burst Your Bubble</Link>
            <Link href="/newsletters/daily-ground">Daily Ground</Link>
            <Link href="/newsletters">All Newsletters</Link>
            <Link href="/rating-system">Rating System</Link>
            <Link href="/source/reuters">Source Profiles</Link>
            <Link href="/interest/politics">Interest Hubs</Link>
          </FooterCol>

          <FooterCol title="Edition">
            <Link href="/?edition=International">International</Link>
            <Link href="/?edition=United%20States">United States</Link>
            <Link href="/?edition=Canada">Canada</Link>
            <Link href="/?edition=United%20Kingdom">United Kingdom</Link>
            <Link href="/?edition=Europe">Europe</Link>
            <Link href="/blindspot?scope=international">International Blindspots</Link>
            <Link href="/local?edition=United%20States">US Local</Link>
            <Link href="/local?edition=Canada">Canada Local</Link>
          </FooterCol>
        </div>
      </div>

      <div className="site-footer-bottom">
        <div className="container site-footer-bottom-inner">
          <span>OpenGroundNews</span>
          <span className="utility-dot" aria-hidden="true">•</span>
          <span className="site-footer-bottom-links">
            {bottomLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </span>
          <span className="utility-dot" aria-hidden="true">•</span>
          <span>Edition: {selectedEdition}</span>
        </div>
      </div>
    </footer>
  );
}
