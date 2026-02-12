import { MyTabs } from "@/components/MyTabs";

export const dynamic = "force-dynamic";

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container u-page-pad">
      <section className="panel u-mb-1 u-grid u-grid-gap-055">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">For You</h1>
          <span className="story-meta">Personalized feed, follows, and tools</span>
        </div>
        <MyTabs />
      </section>
      {children}
    </main>
  );
}

