import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

export type StickyTone = "sun" | "mint" | "sky" | "rose";

interface BottomCardPanelProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  title: string;
  peekTitle?: string;
  subtitle?: string;
  headerLeading?: ReactNode;
  closeLabel?: string;
  bodyClassName?: string;
  stackIndex: number;
  stackTotal: number;
  tone?: StickyTone;
  children: ReactNode;
}

const PULL_CLOSE_THRESHOLD = 88;

export function BottomCardPanel({
  open,
  onToggle,
  onClose,
  title,
  peekTitle,
  subtitle,
  headerLeading,
  bodyClassName,
  stackIndex,
  stackTotal,
  tone = "sun",
  children,
}: BottomCardPanelProps) {
  const dragStartY = useRef(0);
  const dragging = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const style = {
    "--stack-index": stackIndex,
    "--stack-total": stackTotal,
    "--drag-offset": `${dragOffset}px`,
  } as CSSProperties;

  const resetDrag = () => {
    dragging.current = false;
    setDragOffset(0);
  };

  const onDragStart = (e: ReactPointerEvent) => {
    if (!open) return;
    dragging.current = true;
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dy = Math.max(0, e.clientY - dragStartY.current);
    setDragOffset(dy);
  };

  const onDragEnd = (e: ReactPointerEvent) => {
    if (!dragging.current) return;
    const dy = e.clientY - dragStartY.current;
    resetDrag();
    if (dy >= PULL_CLOSE_THRESHOLD) onClose();
  };

  return (
    <aside
        className={`bottom-card bottom-card--${tone} ${open ? "bottom-card--open" : "bottom-card--peek"}${dragOffset > 0 ? " bottom-card--dragging" : ""}`}
        style={style}
        aria-expanded={open}
        aria-label={title}
      >
        {!open ? (
          <button
            type="button"
            className="bottom-card__peek"
            onClick={onToggle}
            aria-label={title}
          >
            <span className="bottom-card__handle" aria-hidden="true" />
            <span className="bottom-card__peek-title">
              {peekTitle ?? title}
            </span>
          </button>
        ) : (
          <>
            <div className="bottom-card__pin" aria-hidden="true">
              <span className="bottom-card__pin-head" />
              <span className="bottom-card__pin-needle" />
            </div>
            <div className="bottom-card__sheet">
              <header
                className="bottom-card__header bottom-card__header--draggable"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={resetDrag}
              >
                <span className="bottom-card__pull-tab" aria-hidden="true">
                  <span className="bottom-card__pull-fold" />
                  <span className="bottom-card__pull-label">pull down</span>
                </span>
                <div className="slide-panel__title-wrap">
                  {headerLeading}
                  <div className="slide-panel__title-text">
                    <h2>{title}</h2>
                    {subtitle && (
                      <p className="slide-panel__subtitle">{subtitle}</p>
                    )}
                  </div>
                </div>
              </header>
              <div
                className={`bottom-card__body slide-panel__body${bodyClassName ? ` ${bodyClassName}` : ""}`}
              >
                {children}
              </div>
            </div>
          </>
        )}
      </aside>
  );
}
