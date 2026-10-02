import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { PlayerProvider, usePlayer } from "../src/player-context";
import type { CatalogSource, Playlist, Track } from "../src/types";

function track(id: string): Track {
  return {
    id,
    title: `Track ${id}`,
    artist: "Example Artist",
    durationSeconds: 210,
    source: { kind: "file", url: `https://cdn.example/${id}.mp3` },
  };
}

function playlist(): Playlist {
  return {
    id: "rehearsal",
    title: "Ensaio",
    tracks: [track("a"), track("b"), track("c")],
  };
}

function wrapper(source?: CatalogSource) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <PlayerProvider source={source}>{children}</PlayerProvider>;
  };
}

describe("PlayerProvider", () => {
  it("starts idle and never autoplays", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    expect(result.current.current).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.queue).toEqual([]);
  });

  it("plays a playlist from the requested index", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 1));

    expect(result.current.current?.id).toBe("b");
    expect(result.current.queue).toHaveLength(3);
    expect(result.current.queueIndex).toBe(1);
    expect(result.current.playlist?.id).toBe("rehearsal");
  });

  it("ignores an empty playlist", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist({ id: "empty", title: "Vazio", tracks: [] }));

    expect(result.current.current).toBeNull();
  });

  it("stays on the last track when repeat is off", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 2));
    act(() => result.current.next());

    expect(result.current.current?.id).toBe("c");
    expect(result.current.queueIndex).toBe(2);
  });

  it("wraps to the first track when repeat is all", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 2));
    act(() => result.current.cycleRepeat());
    act(() => result.current.next());

    expect(result.current.current?.id).toBe("a");
    expect(result.current.queueIndex).toBe(0);
  });

  it("never runs past the first track", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 0));
    act(() => result.current.previous());

    expect(result.current.current?.id).toBe("a");
    expect(result.current.queueIndex).toBe(0);
  });

  it("restarts the current track when previous is pressed early", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 1));
    act(() => result.current.setPosition(30));
    act(() => result.current.previous());

    expect(result.current.current?.id).toBe("b");
    expect(result.current.positionSeconds).toBe(0);
  });

  it("moves to the previous track when pressed past the start", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.playPlaylist(playlist(), 1));
    act(() => result.current.setPosition(1));
    act(() => result.current.previous());

    expect(result.current.current?.id).toBe("a");
  });

  it("cycles repeat mode", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    expect(result.current.repeat).toBe("off");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("all");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("one");
    act(() => result.current.cycleRepeat());
    expect(result.current.repeat).toBe("off");
  });

  it("clamps volume and mutes at zero", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.setVolume(2));
    expect(result.current.volume).toBe(1);

    act(() => result.current.setVolume(-1));
    expect(result.current.volume).toBe(0);
    expect(result.current.isMuted).toBe(true);
  });

  it("toggles playback and clears a previous error", () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper() });

    act(() => result.current.reportError("playback-failed"));
    expect(result.current.error).toBe("playback-failed");

    act(() => result.current.toggle());

    expect(result.current.isPlaying).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("loads the catalogue through the injected source", async () => {
    const source: CatalogSource = { loadPlaylists: async () => [playlist()] };
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper(source) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.playlist?.title).toBe("Ensaio");
  });

  it("surfaces a catalogue failure instead of throwing", async () => {
    const source: CatalogSource = {
      loadPlaylists: async () => {
        throw new Error("api down");
      },
    };
    const { result } = renderHook(() => usePlayer(), { wrapper: wrapper(source) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("catalog-unavailable");
  });

  it("never throws when used outside the provider", () => {
    expect(() => renderHook(() => usePlayer())).toThrow(/PlayerProvider/);
  });
});
