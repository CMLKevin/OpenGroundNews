import Link from "next/link";
import { Story } from "@/lib/types";
import { topicSlug } from "@/lib/lookup";
import { FollowToggle } from "@/components/FollowToggle";

function initials(label: string) {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function SimilarTopicsPanel({ story }: { story: Story }) {
  const tags = story.tags.slice(0, 10);

  return (
    <section className="panel">
      <div className="section-title u-pt-0">
        <h2 className="u-m0">Similar News Topics</h2>
      </div>
      <ul className="topic-list">
        {tags.map((tag, idx) => (
          <li key={`${story.id}-${tag}-${idx}`} className="topic-item">
            <span className="topic-avatar">{initials(tag)}</span>
            <Link href={`/interest/${topicSlug(tag)}`} className="u-no-underline">
              {tag}
            </Link>
            <FollowToggle kind="topic" slug={topicSlug(tag)} label={tag} />
          </li>
        ))}
      </ul>
    </section>
  );
}
