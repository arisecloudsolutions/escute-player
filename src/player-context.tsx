import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { trackCapabilities, type CatalogSource, type Playlist, type Track } from "./types.js";

export type RepeatMode = "off" | "all" | "one";

export interface PlayerState {
  current: Track | null;
  queue: Track[];
  queueIndex: number;
  playlist: Playlist | null;
  isPlaying: boolean;
  isBuffering: boolean;
  error: string | null;
  positionSeconds: number;
  durationSeconds: number | null;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeat: RepeatMode;
  expanded: boolean;
  status: "idle" | "loading" | "ready" | "error";
}

export interface PlayerActions {
  playPlaylist(playlist: Playlist, startIndex?: number): void;
  playTrack(track: Track, queue?: Track[]): void;
  toggle(): void;
  pause(): void;
  resume(): void;
  next(): void;
  previous(): void;
  seek(seconds: number): void;
  setVolume(value: number): void;
  nudgeVolume(delta: number): void;
  toggleMute(): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  setExpanded(value: boolean): void;
  /** Media bridge callbacks, invoked by the engine. */
  reportError(message: string): void;
  setBuffering(value: boolean): void;
  setDuration(seconds: number | null): void;
  setPosition(seconds: number): void;
}

export interface PlayerContextValue extends PlayerState, PlayerActions {
  /** True when the current source exposes a scrubbable timeline. */
  canSeek: boolean;
  /** True when the duration is known before playback starts. */
  hasKnownDuration: boolean;
  /** True when playback depends on a third-party service. */
  requiresNetwork: boolean;
  /** Returns and clears the "keep playing after load" intent. */
  takeResumeIntent(): boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export interface PlayerProviderProps {
  children: ReactNode;
  /** Catalogue. Omit when the consumer feeds tracks directly. */
  source?: CatalogSource;
  /** Persistence key for volume/mute. Omit to disable persistence. */
  storageKey?: string;
}

interface PersistedState {
  volume: number;
  muted: boolean;
}

const INITIAL_STATE: PlayerState = {
  current: null,
  queue: [],
  queueIndex: -1,
  playlist: null,
  isPlaying: false,
  isBuffering: false,
  error: null,
  positionSeconds: 0,
  durationSeconds: null,
  volume: 0.7,
  isMuted: false,
  isShuffled: false,
  repeat: "off",
  expanded: false,
  status: "idle",
};

export function PlayerProvider({ children, source, storageKey }: PlayerProviderProps) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const resumeAfterLoadRef = useRef(false);

  const patch = useCallback((next: Partial<PlayerState>) => {
    setState((previous) => ({ ...previous, ...next }));
  }, []);

  useEffect(() => {
    if (!source) return;

    let cancelled = false;
    patch({ status: "loading" });

    source
      .loadPlaylists()
      .then((playlists) => {
        if (cancelled) return;
        patch({ status: "ready", playlist: playlists[0] ?? null });
      })
      .catch(() => {
        if (!cancelled) patch({ status: "error", error: "catalog-unavailable" });
      });

    return () => {
      cancelled = true;
    };
  }, [source, patch]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      patch({
        volume: typeof parsed.volume === "number" ? parsed.volume : INITIAL_STATE.volume,
        isMuted: Boolean(parsed.muted),
      });
    } catch {
      // Corrupt storage must never break playback.
    }
  }, [storageKey, patch]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ volume: state.volume, muted: state.isMuted } satisfies PersistedState),
      );
    } catch {
      // Persistence is best-effort.
    }
  }, [storageKey, state.volume, state.isMuted]);

  const load = useCallback(
    (track: Track | null, queue: Track[], index: number, playlist: Playlist | null) => {
      resumeAfterLoadRef.current = state.isPlaying;
      patch({
        current: track,
        queue,
        queueIndex: index,
        playlist,
        error: null,
        isBuffering: Boolean(track),
        positionSeconds: 0,
        durationSeconds: track?.durationSeconds ?? null,
      });
    },
    [patch, state.isPlaying],
  );

  const playPlaylist = useCallback(
    (playlist: Playlist, startIndex = 0) => {
      const track = playlist.tracks[startIndex];
      if (!track) return;
      load(track, playlist.tracks, startIndex, playlist);
    },
    [load],
  );

  const playTrack = useCallback(
    (track: Track, queue?: Track[]) => {
      const list = queue && queue.length > 0 ? queue : [track];
      const index = Math.max(0, list.findIndex((item) => item.id === track.id));
      load(track, list, index, null);
    },
    [load],
  );

  const toggle = useCallback(() => {
    setState((previous) => ({ ...previous, isPlaying: !previous.isPlaying, error: null }));
  }, []);

  const pause = useCallback(() => patch({ isPlaying: false }), [patch]);
  const resume = useCallback(() => patch({ isPlaying: true }), [patch]);

  const step = useCallback((direction: 1 | -1) => {
    setState((previous) => {
      if (previous.queue.length === 0) return previous;

      let target = previous.queueIndex + direction;

      if (direction === 1 && previous.isShuffled && previous.queue.length > 1) {
        target = Math.floor(Math.random() * previous.queue.length);
      }

      if (target >= previous.queue.length) {
        if (previous.repeat === "one") return { ...previous, positionSeconds: 0 };
        target = previous.repeat === "all" ? 0 : previous.queue.length - 1;
      }
      if (target < 0) target = 0;

      const track = previous.queue[target];
      if (!track) return previous;

      resumeAfterLoadRef.current = previous.isPlaying;
      return {
        ...previous,
        current: track,
        queueIndex: target,
        error: null,
        isBuffering: true,
        positionSeconds: 0,
        durationSeconds: track.durationSeconds ?? null,
      };
    });
  }, []);

  const next = useCallback(() => step(1), [step]);

  const previous = useCallback(() => {
    setState((previous) => {
      if (previous.positionSeconds > 3) return { ...previous, positionSeconds: 0 };
      const track = previous.queue[Math.max(0, previous.queueIndex - 1)];
      if (!track) return previous;
      resumeAfterLoadRef.current = previous.isPlaying;
      return {
        ...previous,
        current: track,
        queueIndex: Math.max(0, previous.queueIndex - 1),
        isBuffering: true,
        positionSeconds: 0,
        durationSeconds: track.durationSeconds ?? null,
      };
    });
  }, []);

  const seek = useCallback((seconds: number) => patch({ positionSeconds: Math.max(0, seconds) }), [patch]);

  const setVolume = useCallback(
    (value: number) => patch({ volume: Math.min(1, Math.max(0, value)), isMuted: value <= 0 }),
    [patch],
  );

  const nudgeVolume = useCallback(
    (delta: number) => {
      setState((previous) => {
        const volume = Math.min(1, Math.max(0, previous.volume + delta));
        return { ...previous, volume, isMuted: volume === 0 };
      });
    },
    [],
  );

  const toggleMute = useCallback(() => patch({ isMuted: !state.isMuted }), [patch, state.isMuted]);
  const toggleShuffle = useCallback(() => patch({ isShuffled: !state.isShuffled }), [patch, state.isShuffled]);

  const cycleRepeat = useCallback(() => {
    const order: RepeatMode[] = ["off", "all", "one"];
    patch({ repeat: order[(order.indexOf(state.repeat) + 1) % order.length] as RepeatMode });
  }, [patch, state.repeat]);

  const setExpanded = useCallback((value: boolean) => patch({ expanded: value }), [patch]);
  const reportError = useCallback((message: string) => patch({ error: message }), [patch]);
  const setBuffering = useCallback((value: boolean) => patch({ isBuffering: value }), [patch]);
  const setDuration = useCallback(
    (seconds: number | null) => patch({ durationSeconds: seconds }),
    [patch],
  );
  const setPosition = useCallback(
    (seconds: number) => patch({ positionSeconds: Math.max(0, seconds) }),
    [patch],
  );

  const takeResumeIntent = useCallback(() => {
    const resume = resumeAfterLoadRef.current;
    resumeAfterLoadRef.current = false;
    return resume;
  }, []);

  const capabilities = state.current ? trackCapabilities(state.current) : null;

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      canSeek: capabilities?.seekable ?? false,
      hasKnownDuration: capabilities?.hasDuration ?? false,
      requiresNetwork: capabilities?.requiresNetwork ?? false,
      playPlaylist,
      playTrack,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      nudgeVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setExpanded,
      reportError,
      setBuffering,
      setDuration,
      setPosition,
      takeResumeIntent,
    }),
    [
      state,
      capabilities?.seekable,
      capabilities?.hasDuration,
      capabilities?.requiresNetwork,
      playPlaylist,
      playTrack,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      nudgeVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setExpanded,
      reportError,
      setBuffering,
      setDuration,
      setPosition,
      takeResumeIntent,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return context;
}
