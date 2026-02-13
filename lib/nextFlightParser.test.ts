import { describe, expect, it } from "vitest";
import { parseNextFlightPushExpression } from "../scripts/pipeline/extract/next_flight_parser.mjs";

describe("next_flight_parser", () => {
  it("parses string payload arrays safely", () => {
    const out = parseNextFlightPushExpression('[1,"hello",{"k":"v"}]');
    expect(out).toBeTruthy();
    expect(Array.isArray(out)).toBe(true);
    expect(out?.[1]).toBe("hello");
  });

  it("returns null for non-array expressions", () => {
    const out = parseNextFlightPushExpression('window.alert("x")');
    expect(out).toBeNull();
  });

  it("handles single-quoted payloads", () => {
    const out = parseNextFlightPushExpression("['a','payload']");
    expect(out?.[1]).toBe("payload");
  });
});
