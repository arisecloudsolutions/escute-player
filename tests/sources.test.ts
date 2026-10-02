import { describe, expect, it } from "vitest";
import {
  formatDuration,
  mediaKind,
  providerLabel,
  resolveUrl,
  trackCapabilities,
  type Track,
} from "../src/types.js";

function withSource(source: Track["source"], overrides: Partial<Track> = {}): Track {
  return { id: "t1", title: "Título", ...overrides, source };
}

describe("mediaKind", () => {
  it("classifies progressive media as file", () => {
    expect(mediaKind({ kind: "file", url: "https://x/a.mp3" })).toBe("file");
  });

  it("classifies HLS as stream", () => {
    expect(mediaKind({ kind: "hls", url: "https://x/master.m3u8" })).toBe("stream");
  });

  it("classifies third-party pages as embed", () => {
    for (const kind of ["youtube", "soundcloud", "vimeo", "spotify", "embed"] as const) {
      expect(mediaKind({ kind, url: "https://x" } as Track["source"])).toBe("embed");
    }
  });
});

describe("trackCapabilities", () => {
  it("reports local files as seekable with known duration", () => {
    const caps = trackCapabilities(
      withSource({ kind: "file", url: "https://x/a.mp3" }, { durationSeconds: 120 }),
    );

    expect(caps).toMatchObject({ mediaKind: "file", seekable: true, hasDuration: true, offline: false });
  });

  it("does not pretend embeds are seekable", () => {
    const caps = trackCapabilities(withSource({ kind: "youtube", id: "abc" }));

    expect(caps.mediaKind).toBe("embed");
    expect(caps.seekable).toBe(false);
    expect(caps.requiresNetwork).toBe(true);
    expect(caps.hasDuration).toBe(false);
  });

  it("reports HLS as a stream", () => {
    const caps = trackCapabilities(withSource({ kind: "hls", url: "https://x/m.m3u8" }));
    expect(caps.mediaKind).toBe("stream");
    expect(caps.seekable).toBe(true);
  });

  it("never claims offline playback", () => {
    const caps = trackCapabilities(withSource({ kind: "file", url: "https://x/a.mp3" }));
    expect(caps.offline).toBe(false);
  });
});

describe("resolveUrl", () => {
  it("passes through direct URLs", () => {
    expect(resolveUrl({ kind: "file", url: "https://cdn/a.mp3" })).toBe("https://cdn/a.mp3");
  });

  it("builds a YouTube URL from an id", () => {
    expect(resolveUrl({ kind: "youtube", id: "dQw4w9WgXcQ" })).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("honours a start offset", () => {
    expect(resolveUrl({ kind: "youtube", id: "abc", startSeconds: 30 })).toContain("&t=30");
  });

  it("prefers an explicit URL over an id", () => {
    expect(resolveUrl({ kind: "youtube", id: "abc", url: "https://youtu.be/xyz" })).toBe(
      "https://youtu.be/xyz",
    );
  });

  it("returns an empty string when a YouTube source has neither id nor url", () => {
    expect(resolveUrl({ kind: "youtube" })).toBe("");
  });
});

describe("providerLabel", () => {
  it("names known providers", () => {
    expect(providerLabel({ kind: "youtube", id: "a" })).toBe("YouTube");
    expect(providerLabel({ kind: "soundcloud", url: "https://x" })).toBe("SoundCloud");
    expect(providerLabel({ kind: "hls", url: "https://x" })).toBe("HLS");
  });

  it("returns null for plain files", () => {
    expect(providerLabel({ kind: "file", url: "https://x/a.mp3" })).toBeNull();
  });
});

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
