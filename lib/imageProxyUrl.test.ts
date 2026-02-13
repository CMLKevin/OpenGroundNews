import { describe, expect, it } from "vitest";
import { buildImageProxyUrl } from "@/lib/media/imageProxyUrl";

describe("buildImageProxyUrl", () => {
  it("encodes external URL", () => {
    const out = buildImageProxyUrl("https://example.com/a b.jpg");
    expect(out).toContain("/api/images/proxy?url=");
    expect(out).toContain("https%3A%2F%2Fexample.com%2Fa%20b.jpg");
  });

  it("returns empty string for empty value", () => {
    expect(buildImageProxyUrl("")).toBe("");
  });
});
