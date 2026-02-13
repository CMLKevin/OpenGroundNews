import Link from "next/link";
import type { ReactNode } from "react";
import { slugify } from "@/lib/format";

type LinkedSummaryProps = {
  summary: string;
  tags: string[];
};

const STOP_ENTITIES = new Set([
  "The",
  "A",
  "An",
  "In",
  "On",
  "At",
  "For",
  "With",
  "From",
  "By",
  "And",
  "Or",
]);

function dedupeEntities(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = String(value || "").trim().replace(/\s+/g, " ");
    if (!clean) continue;
    if (STOP_ENTITIES.has(clean)) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= 14) break;
  }
  return out;
}

function candidateEntities(summary: string, tags: string[]) {
  const fromTags = (tags || []).map((t) => String(t || "").trim()).filter(Boolean);
  const fromSummary = Array.from(summary.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g)).map((m) => m[0]);
  return dedupeEntities([...fromTags, ...fromSummary]);
}

function linkifiedChunks(text: string, entities: string[]) {
  if (!text.trim() || entities.length === 0) return [text];

  let cursor = 0;
  const lowered = text.toLowerCase();
  const slots: Array<{ start: number; end: number; label: string }> = [];

  for (const entity of entities) {
    const needle = entity.toLowerCase();
    const start = lowered.indexOf(needle);
    if (start < 0) continue;
    const end = start + needle.length;
    const overlaps = slots.some((slot) => !(end <= slot.start || start >= slot.end));
    if (!overlaps) slots.push({ start, end, label: entity });
  }

  slots.sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  for (const slot of slots) {
    if (slot.start > cursor) {
      out.push(text.slice(cursor, slot.start));
    }
    const value = text.slice(slot.start, slot.end);
    out.push(
      <Link key={`${slot.start}-${slot.end}-${value}`} href={`/interest/${slugify(slot.label)}`} className="summary-entity-link">
        {value}
      </Link>,
    );
    cursor = slot.end;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export function LinkedSummary({ summary, tags }: LinkedSummaryProps) {
  const text = String(summary || "").trim();
  if (!text) return null;

  const entities = candidateEntities(text, tags || []);

  return (
    <section className="u-grid u-grid-gap-04">
      <p className="story-summary u-text-098">{linkifiedChunks(text, entities)}</p>
      <div className="story-meta">
        Insights by Ground AI • linked entities and topics are generated from available coverage context.
      </div>
    </section>
  );
}
