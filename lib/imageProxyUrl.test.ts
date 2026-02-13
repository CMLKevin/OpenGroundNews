import { describe, expect, it } from "vitest";
import { buildImageProxyUrl } from "@/lib/media/imageProxyUrl";

describe("buildImageProxyUrl", () => {
  it("encodes external URL", () => {
    const out = buildImageProxyUrl("https://example.com/a b.jpg");
    expect(out).toContain("/api/images/proxy?url=");
    const params = new URLSearchParams(out.split("?")[1] || "");
    expect(params.get("url")).toBe("https://example.com/a b.jpg");
  });

  it("includes kind when provided", () => {
    const out = buildImageProxyUrl("https://example.com/logo.svg", { kind: "logo" });
    expect(out).toContain("/api/images/proxy?");
    expect(out).toContain("kind=logo");
  });

  it("returns empty string for empty value", () => {
    expect(buildImageProxyUrl("")).toBe("");
  });
});
