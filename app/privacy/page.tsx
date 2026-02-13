export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-075">
        <div className="section-title u-pt-0">
          <h1 className="u-m0">Privacy Policy</h1>
          <span className="story-meta">Effective date: February 13, 2026</span>
        </div>

        <p className="u-m0 u-lh-165">
          This policy explains how OpenGroundNews collects, uses, and protects personal data when you use our website,
          APIs, and related features.
        </p>

        <h2 className="u-m0">1. Data We Collect</h2>
        <ul className="u-m0 u-pl-12 u-grid u-grid-gap-035">
          <li>Account data: email address, hashed credentials, and authentication sessions.</li>
          <li>Usage data: reading events, follows, saved stories, feature interactions, and notification preferences.</li>
          <li>Technical data: device/browser metadata, request logs, and anti-abuse telemetry.</li>
        </ul>

        <h2 className="u-m0">2. How We Use Data</h2>
        <ul className="u-m0 u-pl-12 u-grid u-grid-gap-035">
          <li>Operate and secure the service.</li>
          <li>Generate perspective analytics such as bias dashboards and blindspot signals.</li>
          <li>Send requested notifications and newsletter digests.</li>
          <li>Diagnose reliability issues and improve product quality.</li>
        </ul>

        <h2 className="u-m0">3. Legal Bases</h2>
        <p className="story-meta u-m0">
          We process data based on user consent (where required), contractual necessity to provide requested features,
          and legitimate interests in maintaining platform security and performance.
        </p>

        <h2 className="u-m0">4. Data Sharing</h2>
        <p className="story-meta u-m0">
          We do not sell personal data. We share data only with infrastructure and delivery providers needed to run the
          service (for example hosting, email delivery, and push notification infrastructure), subject to contractual
          safeguards.
        </p>

        <h2 className="u-m0">5. Retention</h2>
        <p className="story-meta u-m0">
          We retain account and operational data for as long as needed to provide services, comply with legal
          obligations, and protect against abuse. You may request deletion of your account data.
        </p>

        <h2 className="u-m0">6. Security</h2>
        <p className="story-meta u-m0">
          We use layered security controls including password hashing, session controls, URL validation, and rate
          limiting. No internet system is perfectly secure, so absolute security cannot be guaranteed.
        </p>

        <h2 className="u-m0">7. Your Rights</h2>
        <p className="story-meta u-m0">
          Depending on your jurisdiction, you may have rights to access, correct, delete, or export personal data, and
          to object to certain processing activities.
        </p>

        <h2 className="u-m0">8. Contact</h2>
        <p className="story-meta u-m0">
          For privacy requests, use the project support contact configured in the footer.
        </p>
      </section>
    </main>
  );
}
