import type { ReactNode } from "react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "bottom";
  children: ReactNode;
}

export function SlidePanel({
  open,
  onClose,
  title,
  side = "right",
  children,
}: SlidePanelProps) {
  return (
    <>
      <div
        className={`slide-panel__backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`slide-panel slide-panel--${side} ${open ? "open" : ""}`}
        aria-hidden={!open}
        aria-label={title}
      >
        <header className="slide-panel__header">
          <h2>{title}</h2>
          <button
            type="button"
            className="slide-panel__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="slide-panel__body">{children}</div>
      </aside>
    </>
  );
}
