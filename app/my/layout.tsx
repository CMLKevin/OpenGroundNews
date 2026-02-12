import { MyTabs } from "@/components/MyTabs";

export const dynamic = "force-dynamic";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container" style={{ padding: "1rem 0 2rem" }}>
      <section className="panel" style={{ marginBottom: "1rem", display: "grid", gap: "0.55rem" }}>
        <div className="section-title" style={{ paddingTop: 0 }}>
          <h1 style={{ margin: 0, fontFamily: "var(--font-serif)" }}>For You</h1>
          <span className="story-meta">Personalized feed, follows, and tools</span>
        </div>
        <MyTabs />
      </section>
      {children}
    </main>
  );
}

