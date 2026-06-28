interface DockButtonProps {
  label: string;
  description: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
  shortcut?: string;
  tone?: "mint" | "sun" | "sky" | "rose" | "heat";
}

export function DockButton({
  label,
  description,
  active,
  onClick,
  children,
  badge,
  shortcut,
  tone,
}: DockButtonProps) {
  return (
    <button
      type="button"
      className={`dock-btn${tone ? ` dock-btn--${tone}` : ""} ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      data-tooltip={`${label} — ${description}`}
    >
      {shortcut && (
        <kbd className="dock-btn__shortcut">{shortcut}</kbd>
      )}
      <span className="dock-btn__icon" aria-hidden="true">
        {children}
      </span>
      {badge != null && badge > 0 && (
        <span className="dock-badge">{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}
