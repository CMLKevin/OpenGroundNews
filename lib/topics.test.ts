import { describe, expect, it } from "vitest";
import { canonicalTopicSlug, topicDisplayName } from "@/lib/topics";

describe("topics aliasing", () => {
  it("maps ampersand topic aliases to canonical slug", () => {
    expect(canonicalTopicSlug("business-and-markets")).toBe("business");
    expect(canonicalTopicSlug("health-and-medicine")).toBe("health");
    expect(canonicalTopicSlug("arts-and-entertainment")).toBe("entertainment");
  });

  it("keeps artificial intelligence separate from technology", () => {
    expect(canonicalTopicSlug("artificial-intelligence")).toBe("artificial-intelligence");
    expect(topicDisplayName("artificial-intelligence")).toBe("Artificial Intelligence");
    expect(canonicalTopicSlug("ai")).toBe("artificial-intelligence");
  });
});
