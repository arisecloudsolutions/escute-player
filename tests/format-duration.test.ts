import { describe, expect, it } from "vitest";
import { formatDuration } from "../src/types";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("includes hours when present", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
  });

  it("falls back when the duration is unknown", () => {
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(undefined)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });

  it("never produces negative output", () => {
    expect(formatDuration(-10)).toBe("0:00");
  });
});
