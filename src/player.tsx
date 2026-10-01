import { useEffect, type CSSProperties, type ReactNode } from "react";
import ReactPlayer from "react-player";
import { formatDuration } from "./types.js";
import { usePlayer } from "./player-context.js";

export interface PlayerLabels {
  play: string;
  pause: string;
  next: string;
  previous: string;
  shuffle: string;
  repeat: string;
  mute: string;
  unmute: string;
  volume: string;
  seek: string;
  loading: string;
  error: string;
  expand: string;
  collapse: string;
  queue: string;
  empty: string;
}

const DEFAULT_LABELS: PlayerLabels = {
  play: "Play",
  pause: "Pausa",
  next: "Próxima",
  previous: "Anterior",
  shuffle: "Aleatório",
  repeat: "Repetir",
  mute: "Silenciar",
  unmute: "Restaurar som",
  volume: "Volume",
  seek: "Posição",
  loading: "Carregando",
  error: "Não foi possível reproduzir",
  expand: "Expandir",
  collapse: "Recolher",
  queue: "Fila",
  empty: "Nada para tocar",
};

/** Style hooks so the host can restyle the player without forking it. */
export interface PlayerTheme {
  container: CSSProperties;
  button: CSSProperties;
  buttonActive: CSSProperties;
  meta: CSSProperties;
  submeta: CSSProperties;
  slider: CSSProperties;
  error: CSSProperties;
}

const DEFAULT_THEME: PlayerTheme = {
  container: {
    background: "var(--color-surface-raised)",
    borderTop: "1px solid var(--color-border)",
    padding: "0.75rem 1rem",
  },
  button: {
    background: "transparent",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
  },
  buttonActive: {
    borderColor: "var(--color-brand-accent)",
    color: "var(--color-brand-accent)",
  },
  meta: { color: "var(--color-text-primary)", fontWeight: 600, fontSize: 14 },
  submeta: { color: "var(--color-muted)", fontSize: 12 },
  slider: { accentColor: "var(--color-brand-accent)", flex: 1 },
  error: { color: "var(--color-danger)", fontSize: 12 },
};

export interface PlayerProps {
  /** Visible labels — the package ships no copy. */
  labels?: Partial<PlayerLabels>;
  /** Class names / CSS overrides so the host owns the visual language. */
  theme?: Partial<PlayerTheme>;
  /** Inline styles merged last. */
  style?: CSSProperties;
  className?: string;
  /** Rendered when nothing is loaded. */
  fallback?: ReactNode;
}

/**
 * Persistent player.
 *
 * Styling is intentionally unopinionated: the host passes Tailwind classes or
 * CSS custom properties, so the same component works across the portal and any
 * future band front without forking.
 */
export default function Player({ labels, theme, style, className, fallback }: PlayerProps) {
  const player = usePlayer();
  const text: PlayerLabels = { ...DEFAULT_LABELS, ...labels };
  const tokens: PlayerTheme = { ...DEFAULT_THEME, ...theme };

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
  } = player;

  // Keep the media element in sync with the context.
  useEffect(() => {
    const media = player.mediaRef.current;
    if (!media) return;
    media.volume = isMuted ? 0 : volume;
    if (isPlaying) void media.play().catch(() => undefined);
    else media.pause();
  }, [player, isPlaying, isMuted, volume, current?.mediaUrl]);

  if (!current) return <>{fallback ?? null}</>;

  const repeatLabel = repeat === "one" ? `${text.repeat} (1)` : text.repeat;

  return (
    <div
      className={className}
      style={{ ...tokens.container, ...style }}
      role="region"
      aria-label={text.queue}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={player.toggle}
          aria-label={isPlaying ? text.pause : text.play}
          style={{ width: 44, height: 44, borderRadius: "999px", cursor: "pointer", ...tokens.button }}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>

        <button
          type="button"
          onClick={player.previous}
          aria-label={text.previous}
          style={tokens.button}
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={player.next}
          aria-label={text.next}
          style={tokens.button}
        >
          ⏭
        </button>

        <div style={{ minWidth: 0, flex: "1 1 160px" }}>
          <div style={tokens.meta}>{current.title}</div>
          <div style={tokens.submeta}>
            {current.artist}
            {current.provider ? ` · ${current.provider}` : ""}
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
          aria-label={text.seek}
          aria-valuetext={`${formatDuration(positionSeconds)} de ${formatDuration(durationSeconds)}`}
          style={tokens.slider}
        />
        <span style={{ ...tokens.submeta, fontVariantNumeric: "tabular-nums" }}>
          {formatDuration(durationSeconds)}
        </span>
      </div>

      {/* Live region so assistive tech hears state changes. */}
      <p aria-live="polite" style={{ ...tokens.submeta, minHeight: 18, marginTop: "0.25rem" }}>
        {isBuffering ? text.loading : error ? text.error : ""}
      </p>

      {expanded ? (
        <ol style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
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
                  background: index === player.queueIndex ? "var(--color-surface, #0e1526)" : "transparent",
                  border: "none",
                  color:
                    index === player.queueIndex ? tokens.meta.color : tokens.submeta.color,
                  fontSize: 13,
                }}
              >
                {track.title} — {track.artist}
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <ReactPlayer
        ref={player.mediaRef}
        src={current.mediaUrl}
        playing={isPlaying}
        volume={isMuted ? 0 : volume}
        onReady={() => {
          const media = player.mediaRef.current;
          if (media && Number.isFinite(media.duration)) player.setDuration(media.duration);
          player.setBuffering(false);
          if (player.takeResumeIntent()) player.resume();
        }}
        onTimeUpdate={(event) => player.setPosition(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const duration = event.currentTarget.duration;
          player.setDuration(Number.isFinite(duration) ? duration : null);
        }}
        onEnded={player.next}
        onWaiting={() => player.setBuffering(true)}
        onPlaying={() => player.setBuffering(false)}
        onError={() => {
          player.setBuffering(false);
          player.reportError("playback-failed");
        }}
        style={{ display: "none" }}
      />
    </div>
  );
}
