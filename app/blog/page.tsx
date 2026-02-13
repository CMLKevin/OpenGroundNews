export const dynamic = "force-dynamic";

const posts = [
  { slug: "roadmap-2026", title: "OpenGroundNews 2026 Roadmap", excerpt: "Pipeline upgrades, deeper source metadata, and bias parity milestones." },
  { slug: "how-we-score-bias", title: "How We Score Media Bias", excerpt: "A transparent walkthrough of 3-bucket and 7-bucket bias mapping." },
  { slug: "inside-blindspot", title: "Inside the Blindspot Feed", excerpt: "How coverage asymmetry is calculated and where it can fail." },
];

export default function BlogPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Blog</h1>
        </div>
        <div className="u-grid u-grid-gap-06">
          {posts.map((post) => (
            <article key={post.slug} className="panel u-grid u-grid-gap-03">
              <h2 className="u-m0">{post.title}</h2>
              <p className="story-meta u-m0">{post.excerpt}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
