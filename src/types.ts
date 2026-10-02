/**
 * Public data contract.
 *
 * Framework-free and storage-free by design: a track is described by *what it
 * is* (see `MediaSource`), not by where it lives. Consumers map their own
 * catalogue — CMS, database or REST API — onto this shape.
 */

export type MediaKind = "file" | "stream" | "embed";

/**
 * Where the audio/video actually comes from.
 *
 * `file`/`stream` are progressive media the engine can seek in. `embed` kinds are
 * third-party pages: the provider decides what is allowed, and most of them do
 * not expose a seekable timeline — that is reported honestly by
 * `trackCapabilities()` instead of faked.
 */
export type MediaSource =
  | { kind: "file"; url: string; mimeType?: string }
  | { kind: "stream"; url: string; mimeType?: string }
  | { kind: "hls"; url: string }
  | { kind: "youtube"; id?: string; url?: string; startSeconds?: number }
  | { kind: "soundcloud"; url: string }
  | { kind: "vimeo"; url: string }
  | { kind: "spotify"; url: string }
  | { kind: "embed"; url: string; title?: string }
  | { kind: "custom"; url: string; options?: Record<string, unknown> };

export interface Track {
  /** Stable identifier within its own catalogue. */
  id: string;
  title: string;
  artist?: string | null;
  album?: string | null;
  artworkUrl?: string | null;
  /** Unknown for most embeds — leave `null` rather than guessing. */
  durationSeconds?: number | null;
  source: MediaSource;
  /** Credits/rights note surfaced by the host UI, never enforced here. */
  rightsNote?: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string | null;
  artworkUrl?: string | null;
  tracks: Track[];
}

/** Data source implemented by the consumer. */
export interface CatalogSource {
  loadPlaylists(): Promise<Playlist[]>;
}

export interface TrackCapabilities {
  mediaKind: MediaKind;
  /** The engine can scrub the timeline. */
  seekable: boolean;
  /** Duration is known in advance. */
  hasDuration: boolean;
  /** Playback depends on a third-party service. */
  requiresNetwork: boolean;
  /** Playback works offline once cached (never assumed). */
  offline: boolean;
}

const EMBED_KINDS = new Set<MediaSource["kind"]>([
  "youtube",
  "soundcloud",
  "vimeo",
  "spotify",
  "embed",
]);

export function mediaKind(source: MediaSource): MediaKind {
  if (EMBED_KINDS.has(source.kind)) return "embed";
  return source.kind === "hls" ? "stream" : "file";
}

export function trackCapabilities(track: Track): TrackCapabilities {
  const kind = track.source.kind;

  if (kind === "youtube") {
    // The official embed does not expose a scrubbable timeline to the page.
    return {
      mediaKind: "embed",
      seekable: false,
      hasDuration: typeof track.durationSeconds === "number",
      requiresNetwork: true,
      offline: false,
    };
  }

  if (EMBED_KINDS.has(kind)) {
    return {
      mediaKind: "embed",
      seekable: false,
      hasDuration: typeof track.durationSeconds === "number",
      requiresNetwork: true,
      offline: false,
    };
  }

  return {
    mediaKind: kind === "hls" ? "stream" : "file",
    seekable: true,
    hasDuration: typeof track.durationSeconds === "number",
    requiresNetwork: true,
    offline: false,
  };
}

/** Best-effort display name of the provider behind a source. */
export function providerLabel(source: MediaSource): string | null {
  switch (source.kind) {
    case "youtube":
      return "YouTube";
    case "soundcloud":
      return "SoundCloud";
    case "vimeo":
      return "Vimeo";
    case "spotify":
      return "Spotify";
    case "hls":
      return "HLS";
    case "file":
    case "stream":
      return null;
    default:
      return null;
  }
}

/** URL handed to the engine. Normalises YouTube so ids and URLs both work. */
export function resolveUrl(source: MediaSource): string {
  if (source.kind === "youtube") {
    if (source.url) return source.url;
    if (source.id) {
      const base = source.startSeconds
        ? `https://www.youtube.com/watch?v=${source.id}&t=${source.startSeconds}`
        : `https://www.youtube.com/watch?v=${source.id}`;
      return base;
    }
    return "";
  }
  return source.url;
}

/** Seconds -> `m:ss` / `h:mm:ss`, or `--:--` when unknown. */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return "--:--";
  }

  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}
