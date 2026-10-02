import { useEffect } from "react";

export interface ShortcutHandlers {
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onMute: () => void;
  onSeekForward: () => void;
  onSeekBackward: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  /** Keys to ignore so the portal keeps its own behaviour. */
  ignoreTargets?: string[];
}

const DEFAULT_IGNORE = ["INPUT", "TEXTAREA", "SELECT"];

/**
 * Keyboard transport, following the convention users already know from other
 * players (Space toggles, arrows seek, M mutes). Never fires while the user is
 * typing, and never overrides the browser's own shortcuts.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers, options: UseKeyboardShortcutsOptions = {}): void {
  const { enabled = true, ignoreTargets = DEFAULT_IGNORE } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ignoreTargets.includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          handlers.onToggle();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlers.onSeekForward();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlers.onSeekBackward();
          break;
        case "ArrowUp":
          event.preventDefault();
          handlers.onVolumeUp();
          break;
        case "ArrowDown":
          event.preventDefault();
          handlers.onVolumeDown();
          break;
        case "m":
          handlers.onMute();
          break;
        case "n":
          handlers.onNext();
          break;
        case "p":
          handlers.onPrevious();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, ignoreTargets, handlers]);
}
