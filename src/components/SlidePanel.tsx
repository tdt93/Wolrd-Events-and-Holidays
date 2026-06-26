import type { ReactNode } from "react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerLeading?: ReactNode;
  side?: "left" | "right" | "bottom";
  bodyClassName?: string;
  closeLabel?: string;
  children: ReactNode;
}

export function SlidePanel({
  open,
  onClose,
  title,
  subtitle,
  headerLeading,
  side = "right",
  bodyClassName,
  closeLabel = "Close",
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
          <div className="slide-panel__title-wrap">
            {headerLeading}
            <div className="slide-panel__title-text">
              <h2>{title}</h2>
              {subtitle && (
                <p className="slide-panel__subtitle">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            className="slide-panel__close"
            onClick={onClose}
            aria-label={closeLabel}
          >
            ✕
          </button>
        </header>
        <div
          className={`slide-panel__body${bodyClassName ? ` ${bodyClassName}` : ""}`}
        >
          {children}
        </div>
      </aside>
    </>
  );
}
