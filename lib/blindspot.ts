import { Story } from "@/lib/types";

export type BlindspotSide = "left" | "right";
export type BlindspotColumn = "for-left" | "for-right";

export function computeBlindspotInfo(story: Story, opts?: { thresholdPct?: number; minGapPct?: number }) {
  const thresholdPct = Math.max(55, Math.min(95, opts?.thresholdPct ?? 70));
  const minGapPct = Math.max(10, Math.min(90, opts?.minGapPct ?? 35));

  const left = Number.isFinite(story.bias.left) ? story.bias.left : 0;
  const right = Number.isFinite(story.bias.right) ? story.bias.right : 0;
  const center = Number.isFinite(story.bias.center) ? story.bias.center : 0;

  const dominantSide: BlindspotSide | null = left > right ? "left" : right > left ? "right" : null;
  const dominantPct = dominantSide === "left" ? left : dominantSide === "right" ? right : 0;
  const gapPct = Math.abs(left - right);

  // Guardrails:
  // - A "blindspot" requires meaningful left/right skew, not just high center or missing data.
  // - `thresholdPct` matches the audit expectation (>70% one side).
  const isBlindspotCandidate = dominantSide != null && dominantPct >= thresholdPct && gapPct >= minGapPct && center <= 70;

  if (!isBlindspotCandidate) {
    return {
      isBlindspotCandidate: false,
      dominantSide: dominantSide,
      dominantPct,
      underreportedSide: null as BlindspotSide | null,
      column: null as BlindspotColumn | null,
      label: "Not a blindspot" as const,
    };
  }

  const underreportedSide: BlindspotSide = dominantSide === "left" ? "right" : "left";
  const column: BlindspotColumn = dominantSide === "right" ? "for-left" : "for-right";
  const label = column === "for-left" ? "For the Left" : "For the Right";

  return {
    isBlindspotCandidate: true,
    dominantSide,
    dominantPct,
    underreportedSide,
    column,
    label,
  };
}

