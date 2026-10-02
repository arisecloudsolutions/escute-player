import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { formatDuration, providerLabel, resolveUrl, type Track } from "./types.js";
import { usePlayer } from "./player-context.js";
import { reactPlayerEngine } from "./engines/react-player.js";
import type { MediaEngine } from "./engines/types.js";
import { updateMediaSession } from "./media-session.js";
import { useKeyboardShortcuts } from "./keyboard.js";

export interface PlayerLabels {
  play: string;
  pause: string;
  next: string;
  previous: string;
  shuffle: string;
  repeat: string;
  mute: string;
  unmute: string;
  seek: string;
  loading: string;
  error: string;
  expand: string;
  collapse: string;
  queue: string;
  empty: string;
  notSeekable: string;
  pictureInPicture: string;
  shortcutHint: string;
}

/**
 * Copy is a prop: the package ships no strings, so a host can localise it and
 * the component can be reused by any product.
 */
const DEFAULT_LABELS: PlayerLabels = {
  play: "Play",
  pause: "Pause",
  next: "Next track",
  previous: "Previous track",
  shuffle: "Shuffle",
  repeat: "Repeat",
  mute: "Mute",
  unmute: "Unmute",
  seek: "Track position",
  loading: "Loading…",
  error: "This track could not be played",
  expand: "Open queue",
  collapse: "Close queue",
  queue: "Audio player",
  empty: "Nothing to play yet",
  notSeekable: "Seeking is not available for this source",
  pictureInPicture: "Picture in picture",
  shortcutHint: "Space play · ← → seek · ↑ ↓ volume · M mute",
};

export interface PlayerTheme {
  container: CSSProperties;
  button: CSSProperties;
  buttonActive: CSSProperties;
  meta: CSSProperties;
  submeta: CSSProperties;
  slider: CSSProperties;
  error: CSSProperties;
  list: CSSProperties;
}

/**
 * Styling defaults read the host's CSS custom properties when present, so a
 * design system can restyle the player with theme tokens instead of overrides.
 */
const DEFAULT_THEME: PlayerTheme = {
  container: {
    background: "var(--player-bg, Canvas)",
    color: "var(--player-fg, CanvasText)",
    borderTop: "1px solid var(--player-border, rgba(127,127,127,0.35))",
    padding: "0.75rem 1rem",
    fontFamily: "var(--player-font, system-ui, sans-serif)",
  },
  button: {
    background: "transparent",
    border: "1px solid var(--player-border, rgba(127,127,127,0.35))",
    color: "inherit",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  buttonActive: {
    borderColor: "var(--player-accent, currentColor)",
    color: "var(--player-accent, currentColor)",
  },
  meta: { fontWeight: 600, fontSize: 14 },
  submeta: { fontSize: 12, opacity: 0.75 },
  slider: { accentColor: "var(--player-accent, currentColor)", flex: 1 },
  error: { fontSize: 12, color: "var(--player-error, #dc2626)" },
  list: { listStyle: "none", padding: 0, margin: "0.5rem 0 0" },
};

export interface PlayerProps {
  labels?: Partial<PlayerLabels>;
  theme?: Partial<PlayerTheme>;
  /** Style overrides applied last. */
  style?: CSSProperties;
  className?: string;
  /** Swap the playback engine (default: react-player). */
  engine?: MediaEngine;
  /** Enable keyboard shortcuts. */
  shortcuts?: boolean;
  /** Rendered when nothing is loaded. */
  fallback?: ReactNode;
}

const SEEK_STEP_SECONDS = 5;
const VOLUME_STEP = 0.1;

export default function Player({
  labels,
  theme,
  style,
  className,
  engine = reactPlayerEngine,
  shortcuts = true,
  fallback,
}: PlayerProps) {
  const player = usePlayer();
  const text: PlayerLabels = { ...DEFAULT_LABELS, ...labels };
  const tokens: PlayerTheme = { ...DEFAULT_THEME, ...theme };
  const [pipAvailable, setPipAvailable] = useState(false);

  const {
    current,
    isPlaying,
    isBuffering,
    error,
    positionSeconds,
    durationSeconds,
    volume,
    isMuted,
    isShuffled,
    repeat,
    expanded,
    canSeek,
  } = player;

  const shortcutHandlers = useMemo(
    () => ({
      onToggle: player.toggle,
      onNext: player.next,
      onPrevious: player.previous,
      onMute: player.toggleMute,
      onVolumeUp: () => player.nudgeVolume(VOLUME_STEP),
      onVolumeDown: () => player.nudgeVolume(-VOLUME_STEP),
      onSeekForward: () => player.seek(positionSeconds + SEEK_STEP_SECONDS),
      onSeekBackward: () => player.seek(Math.max(0, positionSeconds - SEEK_STEP_SECONDS)),
    }),
    [player, positionSeconds],
  );

  useKeyboardShortcuts(shortcutHandlers, { enabled: shortcuts });

  // OS-level controls (lock screen, headset, car).
  useEffect(() => {
    updateMediaSession(current, current?.artworkUrl ?? null, isPlaying ? "playing" : "paused", {
      play: player.resume,
      pause: player.pause,
      next: player.next,
      prev: player.previous,
      stop: player.pause,
    });
  }, [current, isPlaying, player]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setPipAvailable("pictureInPictureEnabled" in document);
  }, []);

  const openPictureInPicture = useCallback(async () => {
    try {
      const media = document.querySelector<HTMLVideoElement>("video");
      if (media && document.pictureInPictureEnabled) {
        await media.requestPictureInPicture();
      }
    } catch {
      // Not available for this source; the button simply does nothing.
    }
  }, []);

  if (!current) return <>{fallback ?? null}</>;

  const provider = providerLabel(current.source);
  const repeatLabel = repeat === "one" ? `${text.repeat} (1)` : text.repeat;
  const Engine = engine.Component;

  return (
    <div className={className} style={{ ...tokens.container, ...style }} role="region" aria-label={text.queue}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={isPlaying ? text.pause : text.play}
          style={{ width: 44, height: 44, borderRadius: "999px", cursor: "pointer", ...tokens.button }}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <button type="button" onClick={player.previous} aria-label={text.previous} style={tokens.button}>
          ⏮
        </button>
        <button type="button" onClick={player.next} aria-label={text.next} style={tokens.button}>
          ⏭
        </button>

        {current.artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- consumer-provided URL, cannot be optimised here
          <img
            src={current.artworkUrl}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 6, objectFit: "cover" }}
          />
        ) : null}

        <div style={{ minWidth: 0, flex: "1 1 160px" }}>
          <div style={tokens.meta}>{current.title}</div>
          <div style={tokens.submeta}>
            {[current.artist, provider, current.rightsNote].filter(Boolean).join(" · ")}
          </div>
        </div>

        <button
          type="button"
          onClick={player.toggleShuffle}
          aria-pressed={isShuffled}
          aria-label={text.shuffle}
          style={{ ...tokens.button, ...(isShuffled ? tokens.buttonActive : {}) }}
        >
          🔀
        </button>
        <button
          type="button"
          onClick={player.cycleRepeat}
          aria-pressed={repeat !== "off"}
          aria-label={repeatLabel}
          style={{ ...tokens.button, ...(repeat !== "off" ? tokens.buttonActive : {}) }}
        >
          {repeat === "one" ? "🔁" : "↻"}
        </button>
        <button
          type="button"
          onClick={player.toggleMute}
          aria-pressed={isMuted}
          aria-label={isMuted ? text.unmute : text.mute}
          style={{ ...tokens.button, ...(isMuted ? tokens.buttonActive : {}) }}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
        {pipAvailable ? (
          <button
            type="button"
            onClick={openPictureInPicture}
            aria-label={text.pictureInPicture}
            style={tokens.button}
          >
            ⧉
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => player.setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? text.collapse : text.expand}
          style={tokens.button}
        >
          {expanded ? "▾" : "▴"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.6rem" }}>
        <span style={{ ...tokens.submeta, fontVariantNumeric: "tabular-nums" }}>
          {formatDuration(positionSeconds)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(1, durationSeconds ?? 0)}
          value={Math.min(positionSeconds, durationSeconds ?? 0)}
          onChange={(event) => player.seek(Number(event.target.value))}
          disabled={!canSeek}
          title={canSeek ? text.seek : text.notSeekable}
          aria-label={canSeek ? text.seek : text.notSeekable}
          aria-valuetext={`${formatDuration(positionSeconds)} de ${formatDuration(durationSeconds)}`}
          style={tokens.slider}
        />
        <span style={{ ...tokens.submeta, fontVariantNumeric: "tabular-nums" }}>
          {formatDuration(durationSeconds)}
        </span>
      </div>

      <p aria-live="polite" style={{ ...tokens.submeta, minHeight: 18, margin: "0.25rem 0 0" }}>
        {isBuffering ? text.loading : error ? text.error : ""}
      </p>

      {shortcuts ? (
        <p style={{ ...tokens.submeta, margin: "0.15rem 0 0" }}>{text.shortcutHint}</p>
      ) : null}

      {expanded ? (
        <ol style={tokens.list}>
          {player.queue.map((track, index) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => player.playTrack(track, player.queue)}
                aria-current={index === player.queueIndex ? "true" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "0.4rem 0.5rem",
                  cursor: "pointer",
                  background: index === player.queueIndex ? "var(--player-active, rgba(127,127,127,0.15))" : "transparent",
                  border: "none",
                  color: "inherit",
                  fontSize: 13,
                }}
              >
                {track.title}
                {track.artist ? ` — ${track.artist}` : ""}
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <Engine
        source={current.source}
        url={resolveUrl(current.source)}
        playing={isPlaying}
        volume={isMuted ? 0 : volume}
        muted={isMuted}
        positionSeconds={positionSeconds}
        onReady={(duration) => {
          player.setDuration(duration);
          player.setBuffering(false);
          if (player.takeResumeIntent()) player.resume();
        }}
        onPosition={player.setPosition}
        onDuration={player.setDuration}
        onEnded={player.next}
        onWaiting={() => player.setBuffering(true)}
        onPlaying={() => player.setBuffering(false)}
        onError={() => {
          player.setBuffering(false);
          player.reportError("playback-failed");
        }}
      />
    </div>
  );
}

export type { Track };
