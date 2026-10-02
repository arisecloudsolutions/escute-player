import ReactPlayer from "react-player";
import type { MediaEngine, MediaEngineProps } from "./types.js";
import { trackCapabilities } from "../types.js";

/**
 * Default engine, backed by `react-player` v3 (MIT).
 *
 * Handles progressive files, HLS and the common embeds (YouTube, SoundCloud,
 * Vimeo, Spotify). Consumers needing something else supply their own engine.
 */
export const reactPlayerEngine: MediaEngine = {
  seekable: (track) => trackCapabilities(track).seekable,

  Component: function ReactPlayerEngine({
    url,
    playing,
    volume,
    onReady,
    onPosition,
    onDuration,
    onEnded,
    onWaiting,
    onPlaying,
    onError,
  }: MediaEngineProps) {
    if (!url) return null;

    return (
      <ReactPlayer
        src={url}
        playing={playing}
        volume={volume}
        onReady={() => {
          const media = document.querySelector<HTMLVideoElement>("video, audio");
          onReady(media && Number.isFinite(media.duration) ? media.duration : null);
        }}
        onTimeUpdate={(event) => onPosition(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const duration = event.currentTarget.duration;
          onDuration(Number.isFinite(duration) ? duration : null);
        }}
        onEnded={onEnded}
        onWaiting={onWaiting}
        onPlaying={onPlaying}
        onError={onError}
        style={{ display: "none" }}
      />
    );
  },
};
