import { MyTabs } from "@/components/MyTabs";
import Link from "next/link";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const followCount = user
    ? await db.follow
        .count({ where: { userId: user.id, kind: "topic" } })
        .catch(() => 0)
    : 0;

  return (
    <main className="container u-page-pad">
      <section className="panel u-mb-1 u-grid u-grid-gap-055">
        <div className="section-title u-pt-0">
          <h1 className="u-m0 u-font-serif">For You</h1>
          <span className="story-meta">Personalized feed, follows, and tools</span>
        </div>
        <MyTabs />
        <div className="story-meta">
          <Link href="/my/discover" className="u-no-underline">
            Following: {followCount} topics
          </Link>
        </div>
      </section>
      {children}
    </main>
  );
}
