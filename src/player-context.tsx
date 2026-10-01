import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { CatalogSource, Playlist, Track } from "./types";

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
  toggleMute(): void;
  toggleShuffle(): void;
  cycleRepeat(): void;
  setExpanded(value: boolean): void;
  /** Media bridge callbacks invoked by `<Player/>`. */
  reportError(message: string): void;
  setBuffering(value: boolean): void;
  setDuration(seconds: number | null): void;
  setPosition(seconds: number): void;
}

export interface PlayerContextValue extends PlayerState, PlayerActions {
  /** Media element owned by the UI; the context only reads/writes it. */
  mediaRef: RefObject<HTMLVideoElement | null>;
  /**
   * Returns and clears the pending "keep playing after the new track loads"
   * intent. Called by `<Player/>` once the media element is ready.
   */
  takeResumeIntent(): boolean;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export interface PlayerProviderProps {
  children: ReactNode;
  /** Data source. Omit when the consumer feeds tracks directly. */
  source?: CatalogSource;
  /** Persistence key for volume/position. Omit to disable persistence. */
  storageKey?: string;
  /** UI-owned media element. */
  mediaRef?: RefObject<HTMLVideoElement | null>;
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

export function PlayerProvider({
  children,
  source,
  storageKey,
  mediaRef: externalMediaRef,
}: PlayerProviderProps) {
  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const fallbackMediaRef = useRef<HTMLVideoElement | null>(null);
  const mediaRef = externalMediaRef ?? fallbackMediaRef;
  const resumeAfterLoadRef = useRef(false);

  const patch = useCallback((next: Partial<PlayerState>) => {
    setState((previous) => ({ ...previous, ...next }));
  }, []);

  useEffect(() => {
    if (!source) return;

    let cancelled = false;
    setState((previous) => ({ ...previous, status: "loading" }));

    source
      .loadPlaylists()
      .then((playlists) => {
        if (cancelled) return;
        setState((previous) => ({ ...previous, status: "ready", playlist: playlists[0] ?? null }));
      })
      .catch(() => {
        if (!cancelled) {
          patch({ status: "error", error: "catalog-unavailable" });
        }
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
      // Persistence is best-effort (quota, private mode).
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
        durationSeconds: track ? null : null,
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

  const step = useCallback(
    (direction: 1 | -1) => {
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
          durationSeconds: null,
        };
      });
    },
    [],
  );

  const next = useCallback(() => step(1), [step]);

  const previous = useCallback(() => {
    setState((previous) => {
      if (previous.positionSeconds > 3) return { ...previous, positionSeconds: 0 };
      const target = Math.max(0, previous.queueIndex - 1);
      const track = previous.queue[target];
      if (!track) return previous;
      resumeAfterLoadRef.current = previous.isPlaying;
      return {
        ...previous,
        current: track,
        queueIndex: target,
        isBuffering: true,
        positionSeconds: 0,
      };
    });
  }, []);

  const seek = useCallback(
    (seconds: number) => {
      const media = mediaRef.current;
      const target = Math.max(0, seconds);
      if (media) media.currentTime = target;
      patch({ positionSeconds: target });
    },
    [mediaRef, patch],
  );

  const setVolume = useCallback(
    (value: number) => patch({ volume: Math.min(1, Math.max(0, value)), isMuted: value <= 0 }),
    [patch],
  );

  const toggleMute = useCallback(
    () => patch({ isMuted: !state.isMuted }),
    [patch, state.isMuted],
  );
  const toggleShuffle = useCallback(
    () => patch({ isShuffled: !state.isShuffled }),
    [patch, state.isShuffled],
  );

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

  // Consumed by the UI layer when the element reports it is ready.
  const consumeResumeIntent = useCallback(() => {
    const resume = resumeAfterLoadRef.current;
    resumeAfterLoadRef.current = false;
    return resume;
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      playPlaylist,
      playTrack,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setExpanded,
      reportError,
      setBuffering,
      setDuration,
      setPosition,
      mediaRef,
      takeResumeIntent: consumeResumeIntent,
    }),
    [
      state,
      playPlaylist,
      playTrack,
      toggle,
      pause,
      resume,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      toggleShuffle,
      cycleRepeat,
      setExpanded,
      reportError,
      setBuffering,
      setDuration,
      setPosition,
      mediaRef,
      consumeResumeIntent,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return context;
}
