import { describe, expect, it } from "vitest";
import { applyRateLimit } from "@/lib/infra/rateLimit";

describe("applyRateLimit", () => {
  it("enforces in-memory limits", async () => {
    const one = await applyRateLimit({ namespace: "test", identifier: "abc", limit: 2, windowSec: 10 });
    const two = await applyRateLimit({ namespace: "test", identifier: "abc", limit: 2, windowSec: 10 });
    const three = await applyRateLimit({ namespace: "test", identifier: "abc", limit: 2, windowSec: 10 });
    expect(one.ok).toBe(true);
    expect(two.ok).toBe(true);
    expect(three.ok).toBe(false);
  });
});
