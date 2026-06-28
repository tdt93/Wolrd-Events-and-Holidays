import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

interface PanelShortcutHandlers {
  onFilters: () => void;
  onEvents: () => void;
  onHeatmap: () => void;
  onSettings: () => void;
  onClose?: () => void;
}

export function usePanelShortcuts(
  enabled: boolean,
  handlers: PanelShortcutHandlers,
) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case "1":
          event.preventDefault();
          handlers.onEvents();
          break;
        case "2":
          event.preventDefault();
          handlers.onFilters();
          break;
        case "3":
          event.preventDefault();
          handlers.onHeatmap();
          break;
        case "4":
          event.preventDefault();
          handlers.onSettings();
          break;
        case "Escape":
          handlers.onClose?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handlers]);
}
