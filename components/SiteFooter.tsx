import Link from "next/link";

export async function SiteFooter() {
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
        ["Help", "/help"],
        ["Blog", "/blog"],
        ["Testimonials", "/testimonials"],
        ["My News Bias", "/my-news-bias"],
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
        </div>
      </div>
    </footer>
  );
}
