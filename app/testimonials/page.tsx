export const dynamic = "force-dynamic";

const testimonials = [
  {
    quote: "OpenGroundNews made me realize how often I only saw one side of a story.",
    by: "Independent researcher",
  },
  {
    quote: "Blindspot alerts changed how I build my morning reading routine.",
    by: "Policy analyst",
  },
  {
    quote: "The source cards and ownership metadata add context I couldn't get in a normal news app.",
    by: "Graduate student",
  },
];

export default function TestimonialsPage() {
  return (
    <main className="container u-page-pad">
      <section className="panel u-grid u-grid-gap-07">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">Testimonials</h1>
        </div>
        <div className="u-grid u-grid-gap-06">
          {testimonials.map((item, idx) => (
            <figure className="testimonial" key={`test-${idx}`}>
              <blockquote>“{item.quote}”</blockquote>
              <figcaption>{item.by}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
