import type { MediaSource, Track } from "../types.js";

/**
 * Pluggable playback engine.
 *
 * The default engine wraps `react-player` (MIT). A consumer that prefers a
 * different stack — native `<audio>`, `video.js`, a Web Audio graph — can pass
 * its own implementation and the player UI, queue and shortcuts keep working.
 */
export interface MediaEngineProps {
  source: MediaSource;
  url: string;
  playing: boolean;
  volume: number;
  muted: boolean;
  /** Seek target in seconds; the engine should apply it. */
  positionSeconds: number;
  onReady(durationSeconds: number | null): void;
  onPosition(seconds: number): void;
  onDuration(seconds: number | null): void;
  onEnded(): void;
  onWaiting(): void;
  onPlaying(): void;
  onError(): void;
}

export interface MediaEngine {
  /** React component that owns the media element. */
  Component: (props: MediaEngineProps) => React.ReactNode;
  /** True when the engine exposes a scrubbable timeline. */
  seekable?: (track: Track) => boolean;
}
