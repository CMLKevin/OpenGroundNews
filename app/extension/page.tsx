import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ExtensionPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-08">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">OpenGroundNews Browser Extension</h1>
          <span className="story-meta">Chrome / Edge (MV3)</span>
        </div>
        <p className="u-m0 u-maxw-75ch">
          Open links in Reader mode instantly, jump to perspective-aware search for the current page, and keep your
          OpenGroundNews workflow one click away while browsing.
        </p>
        <div className="chip-row">
          <a className="btn" href="#install">
            Install instructions
          </a>
          <a className="btn" href="#features">
            See features
          </a>
          <Link className="btn" href="/reader">
            Open Reader
          </Link>
        </div>
      </section>

      <section id="features" className="panel u-mt-1 u-grid u-grid-gap-065">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">What it does</h2>
        </div>
        <ul className="u-m0 u-pl-11 u-grid u-grid-gap-045">
          <li>Open the current tab in `/reader?url=...` to read with archive fallback.</li>
          <li>Search coverage quickly with `/search?q=...` from the active page title or URL.</li>
          <li>Works with your self-hosted OpenGroundNews base URL via extension options.</li>
          <li>Supports Chromium browsers that allow Manifest V3 unpacked extensions.</li>
        </ul>
      </section>

      <section id="install" className="panel u-mt-1 u-grid u-grid-gap-065">
        <div className="section-title u-pt-0">
          <h2 className="u-m0">Install</h2>
          <span className="story-meta">Local development build</span>
        </div>
        <ol className="u-m0 u-pl-11 u-grid u-grid-gap-045">
          <li>Open `chrome://extensions` (or `edge://extensions`).</li>
          <li>Enable Developer mode.</li>
          <li>Click Load unpacked and choose the repository `extension/` directory.</li>
          <li>Open the extension options and set your OpenGroundNews base URL.</li>
        </ol>
        <details>
          <summary className="story-meta u-cursor-pointer">
            Developer details
          </summary>
          <p className="story-meta u-mt-05">
            The extension code is in <code>extension/</code> (`manifest.json`, `popup.html`, `options.html`). It
            uses MV3 and does not require a separate backend service.
          </p>
        </details>
      </section>
    </main>
  );
}

