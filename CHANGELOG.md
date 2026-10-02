# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-10-01

First public release.

### Added

- **Multi-source playback** via a discriminated `MediaSource` union:
  `file`, `stream`, `hls`, `youtube`, `soundcloud`, `vimeo`, `spotify`, generic
  `embed`, and `custom`.
- **Honest capabilities** — `trackCapabilities()` reports whether a source is
  seekable, whether the duration is known, and whether playback needs the
  network. The official YouTube embed is *not* reported as seekable.
- **Pluggable engine** — `MediaEngine` interface with `react-player` v3 as the
  default. Bring your own engine (native `<audio>`, `video.js`, Web Audio)
  without touching queue, shortcuts or Media Session.
- **Queue and transport** — play/pause, next/previous (restart past 3 s),
  shuffle, repeat (`off` / `all` / `one`), seek, volume, mute.
- **Persistence** — volume and mute via an optional `storageKey`.
- **Media Session API** — artwork, title and transport on lock screens, headset
  buttons and car systems; no-ops where unsupported.
- **Keyboard shortcuts** — Space/K play, ←/→ seek, ↑/↓ volume, M mute, N/P
  track; suppressed while typing.
- **Picture-in-Picture** button when the source supports it.
- **Accessibility** — every control is labelled, toggles expose `aria-pressed`,
  status changes announce through an `aria-live` region, and the seek slider is
  disabled (with an explanation) when the source is not seekable.
- **Theming by CSS custom properties** (`--player-bg`, `--player-accent`, …)
  plus per-part style overrides, so no visual framework is imposed.
- **Localised copy** — all labels are props; the package ships no strings.
- Dual **ESM + CJS** build with type declarations.

### Notes

- No database, storage, credentials or router dependency: the catalogue is
  supplied by the consumer through `CatalogSource`.
- The player never downloads media and never autoplays without a user gesture.
