import Link from "next/link";
import { ReaderClient } from "@/components/ReaderClient";
import { getCurrentUser } from "@/lib/authStore";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ url?: string }> };

export default async function ReaderPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const { url } = await searchParams;
  const initialUrl = (url || "").trim();

  return (
    <main className="container u-page-pad">
      {!user ? (
        <section className="panel u-grid u-grid-gap-07 u-mb-1">
          <div className="section-title u-pt-0">
            <h1 className="u-m0 u-font-serif">Reader</h1>
            <span className="story-meta">Sign in required</span>
          </div>
          <p className="u-m0 u-maxw-75ch">
            The archive-first reader runs server-side extraction and is protected behind sign-in to prevent abuse.
          </p>
          <div className="chip-row">
            <Link className="btn" href={`/login?next=${encodeURIComponent(`/reader${initialUrl ? `?url=${encodeURIComponent(initialUrl)}` : ""}`)}`}>
              Sign in to use Reader
            </Link>
            <Link className="btn btn-secondary" href="/">
              Back to Home
            </Link>
          </div>
        </section>
      ) : null}

      {user ? <ReaderClient initialUrl={initialUrl} /> : null}
    </main>
  );
}
