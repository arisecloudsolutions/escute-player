import { describe, expect, it } from "vitest";
import { formatDuration } from "../src/types.js";

describe("formatDuration (re-exported from the public entry point)", () => {
  it("is available to consumers", () => {
    expect(formatDuration(90)).toBe("1:30");
  });
});
