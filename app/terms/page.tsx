export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">Terms of Service</h1>
          <span className="story-meta">Effective date: February 13, 2026</span>
        </div>

        <p className="u-m0 u-lh-165">
          These Terms govern your use of OpenGroundNews. By accessing the service, you agree to comply with these
          Terms and all applicable laws. If you do not agree, do not use the service.
        </p>

        <h2 className="u-m0">1. Service Description</h2>
        <p className="story-meta u-m0">
          OpenGroundNews aggregates publicly available news references and metadata to provide perspective-aware
          comparison tools. We may modify or discontinue features at any time.
        </p>

        <h2 className="u-m0">2. Accounts and Security</h2>
        <p className="story-meta u-m0">
          You are responsible for safeguarding your account credentials and any activity under your account. You must
          provide accurate information and promptly update it when changes occur.
        </p>

        <h2 className="u-m0">3. Acceptable Use</h2>
        <ul className="u-m0 u-pl-12 u-grid u-grid-gap-035">
          <li>Do not abuse APIs, scraping features, or automated workflows to degrade service availability.</li>
          <li>Do not attempt unauthorized access to internal systems, private networks, or restricted data.</li>
          <li>Do not use the platform for unlawful harassment, fraud, malware distribution, or rights infringement.</li>
        </ul>

        <h2 className="u-m0">4. Third-Party Content</h2>
        <p className="story-meta u-m0">
          Articles and publisher content remain owned by their respective rights holders. OpenGroundNews provides
          references, metadata, and extracted snippets where permitted. You are responsible for complying with publisher
          terms when visiting external sources.
        </p>

        <h2 className="u-m0">5. Disclaimers</h2>
        <p className="story-meta u-m0">
          The service is provided "as is" and "as available" without warranties of uninterrupted availability,
          completeness, or fitness for a specific purpose.
        </p>

        <h2 className="u-m0">6. Limitation of Liability</h2>
        <p className="story-meta u-m0">
          To the maximum extent permitted by law, OpenGroundNews and its contributors are not liable for indirect,
          incidental, special, consequential, or punitive damages arising from your use of the service.
        </p>

        <h2 className="u-m0">7. Termination</h2>
        <p className="story-meta u-m0">
          We may suspend or terminate access for violations of these Terms or security misuse. You may stop using the
          service at any time.
        </p>

        <h2 className="u-m0">8. Contact</h2>
        <p className="story-meta u-m0">
          For legal or terms questions, contact the project maintainer via the configured support channel in the footer.
        </p>
      </section>
    </main>
  );
}
