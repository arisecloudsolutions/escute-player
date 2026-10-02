import type { Track } from "./types.js";

/**
 * Media Session API — lets the OS show artwork, title and transport controls
 * (lock screen, headset buttons, car systems). Best-effort: unsupported
 * browsers simply ignore it.
 */
export function updateMediaSession(
  track: Track | null,
  artworkUrl: string | null,
  state: "playing" | "paused",
  actions: {
    play: () => void;
    pause: () => void;
    prev?: () => void;
    next?: () => void;
    seekTo?: (seconds: number) => void;
    stop?: () => void;
  },
): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

  try {
    const session = navigator.mediaSession;
    session.metadata = track
      ? new MediaMetadata({
          title: track.title,
          artist: track.artist ?? undefined,
          album: track.album ?? undefined,
          artwork: artworkUrl
            ? [{ src: artworkUrl, sizes: "512x512", type: "image/jpeg" }]
            : [],
        })
      : null;

    session.playbackState = track ? state : "none";

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => actions.play()],
      ["pause", () => actions.pause()],
    ];

    if (actions.prev) handlers.push(["previoustrack", () => actions.prev?.()]);
    if (actions.next) handlers.push(["nexttrack", () => actions.next?.()]);
    if (actions.seekTo) handlers.push(["seekto", () => undefined]);
    if (actions.stop) handlers.push(["stop", () => actions.stop?.()]);

    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Unsupported action on this browser: ignore.
      }
    }
  } catch {
    // Never let a platform nicety break playback.
  }
}

export function clearMediaSession(): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  } catch {
    // ignore
  }
}
