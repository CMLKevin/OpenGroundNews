import { describe, expect, it } from "vitest";
import { computeBlindspotInfo } from "@/lib/blindspot";
import type { Story } from "@/lib/types";

function stubStory(bias: { left: number; center: number; right: number }): Story {
  return {
    id: "s1",
    slug: "s1",
    title: "t",
    summary: "sum",
    topic: "topic",
    location: "International",
    tags: [],
    imageUrl: "",
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sourceCount: 10,
    bias,
    blindspot: false,
    local: false,
    trending: false,
    sources: [],
  };
}

describe("computeBlindspotInfo", () => {
  it("classifies a strong right-skew story as blindspot for the left", () => {
    const info = computeBlindspotInfo(stubStory({ left: 10, center: 10, right: 80 }));
    expect(info.isBlindspotCandidate).toBe(true);
    expect(info.column).toBe("for-left");
  });

  it("does not classify when center dominates", () => {
    const info = computeBlindspotInfo(stubStory({ left: 10, center: 80, right: 10 }));
    expect(info.isBlindspotCandidate).toBe(false);
  });

  it("does not classify when gap is too small", () => {
    const info = computeBlindspotInfo(stubStory({ left: 55, center: 0, right: 45 }));
    expect(info.isBlindspotCandidate).toBe(false);
  });
});

