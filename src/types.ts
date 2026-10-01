/**
 * Neutral data contract.
 *
 * Deliberately free of any ORM, schema or framework type: the portal feeds this
 * from a versioned seed today and from `escute-online-api` (REST /v1) later.
 * Nothing here knows about MySQL, Spaces or Next.js.
 */

export type TrackMediaKind = "audio" | "embed";

export interface Track {
  /** Stable identifier within its source (slug, database id, …). */
  id: string;
  title: string;
  artist: string;
  /** Duration in seconds. `null` when unknown (common for embeds). */
  durationSeconds: number | null;
  /** Direct, playable URL. For embeds this is the provider page URL. */
  mediaUrl: string;
  mediaKind: TrackMediaKind;
  /** Cover image URL, when available. */
  artworkUrl?: string | null;
  album?: string | null;
  /** Only rendered for `embed` tracks. */
  provider?: string | null;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string | null;
  artworkUrl?: string | null;
  tracks: Track[];
}

/**
 * Data source. Implemented by the consumer: the portal ships a seed adapter and
 * will add a REST adapter once the API is live.
 */
export interface CatalogSource {
  loadPlaylists(): Promise<Playlist[]>;
}

/** Seconds -> `m:ss` (or `h:mm:ss`), rounded down. */
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
