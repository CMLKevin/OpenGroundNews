import { getDashboardStats } from "@/lib/store";
import { getCurrentUser } from "@/lib/authStore";
import { db } from "@/lib/db";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const parityChecklist = [
  { feature: "Bias distribution on cards", status: "done" },
  { feature: "Blindspot feed", status: "done" },
  { feature: "Interest topic hubs (/interest/[slug])", status: "done" },
  { feature: "Source hubs (/source/[slug])", status: "done" },
  { feature: "Saved feed (/my) + follow toggles", status: "done" },
  { feature: "Perspective summary tabs", status: "done" },
  { feature: "Source sorting and filters (bias/factuality/ownership/paywall)", status: "done" },
  { feature: "Archive-first article reader with fallback", status: "done" },
  { feature: "Edition selector", status: "done" },
  { feature: "User auth + cloud-synced follows", status: "planned" },
  { feature: "Podcast context panels", status: "planned" },
  { feature: "Mobile native app parity", status: "planned" },
];

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");

  const stats = await getDashboardStats();
  const runs = await db.ingestionRun.findMany({ orderBy: { startedAt: "desc" }, take: 18 });

  async function triggerIngest() {
    "use server";
    const u = await getCurrentUser();
    if (!u || u.role !== "admin") redirect("/login?next=/admin");

    const apiKey = (process.env.OGN_API_KEY || process.env.OPEN_GROUND_NEWS_API_KEY || "").trim();
    if (!apiKey) throw new Error("OGN_API_KEY is not configured on the server.");

    const h = await headers();
    const proto = h.get("x-forwarded-proto") || "http";
    const host = h.get("host") || "localhost:3000";
    const base = `${proto}://${host}`;

    const session = (await cookies()).get("ogn_session")?.value || "";
    const cookieHeader = session ? `ogn_session=${session}` : "";

    const res = await fetch(`${base}/api/ingest/groundnews`, {
      method: "POST",
      headers: {
        "x-ogn-api-key": apiKey,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = typeof (json as any)?.error === "string" ? (json as any).error : `Ingest failed (${res.status})`;
      throw new Error(msg);
    }

    revalidatePath("/admin");
    revalidatePath("/");
  }

  return (
    <main className="container u-page-pad-compact">
      <div className="panel u-grid u-grid-gap-1">
        <h1 className="u-m0">Ingestion + Parity Admin</h1>
        <div className="kpi-strip">
          <div className="kpi">
            <span>Stories</span>
            <strong>{stats.storyCount}</strong>
          </div>
          <div className="kpi">
            <span>Source Articles</span>
            <strong>{stats.sourceArticleCount}</strong>
          </div>
          <div className="kpi">
            <span>Unique Outlets</span>
            <strong>{stats.uniqueOutletCount}</strong>
          </div>
          <div className="kpi">
            <span>Archive Entries</span>
            <strong>{stats.archiveCacheCount}</strong>
          </div>
          <div className="kpi">
            <span>Last Mode</span>
            <strong className="u-text-095">{stats.ingestion.lastMode ?? "n/a"}</strong>
          </div>
        </div>

        <form action={triggerIngest} className="panel u-flex u-justify-between u-flex-gap-1 u-items-center">
          <div className="u-grid u-grid-gap-015">
            <strong>Trigger Ground News ingestion</strong>
            <span className="story-meta">
              Uses server-side <code>OGN_API_KEY</code> + your admin session cookie (no key exposed to the browser).
            </span>
          </div>
          <button className="btn" type="submit">
            Run ingest
          </button>
        </form>

        <section className="panel u-grid u-grid-gap-06">
          <div className="section-title u-pt-0">
            <h2 className="u-m0">Recent Ingestion Runs</h2>
            <span className="story-meta">DB</span>
          </div>
          <div className="u-overflow-x-auto">
            <table className="u-table-admin">
              <thead>
                <tr className="u-text-left">
                  <th>Started</th>
                  <th>Status</th>
                  <th>Routes</th>
                  <th>Unique Links</th>
                  <th>Stories</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.startedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </td>
                    <td>
                      <span className="pill">{r.status}</span>
                    </td>
                    <td>{r.routeCount}</td>
                    <td>{r.uniqueStoryLinks}</td>
                    <td>{r.ingestedStories}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <h2 className="u-mt-0">Feature Parity Checklist</h2>
          <ul className="u-m0 u-pl-12 u-grid u-grid-gap-04">
            {parityChecklist.map((item) => (
              <li key={item.feature}>
                <strong>{item.status === "done" ? "[Done]" : "[Planned]"}</strong> {item.feature}
              </li>
            ))}
          </ul>
        </section>

        <div className="panel">
          <pre className="u-m0 u-prewrap">{JSON.stringify(stats.ingestion, null, 2)}</pre>
        </div>
      </div>
    </main>
  );
}
