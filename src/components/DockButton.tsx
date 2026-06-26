interface DockButtonProps {
  label: string;
  description: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}

export function DockButton({
  label,
  description,
  active,
  onClick,
  children,
  badge,
}: DockButtonProps) {
  return (
    <button
      type="button"
      className={`dock-btn ${active ? "active" : ""}`}
      onClick={onClick}
      aria-label={label}
      data-tooltip={`${label} — ${description}`}
    >
      <span className="dock-btn__icon" aria-hidden="true">
        {children}
      </span>
      {badge != null && badge > 0 && (
        <span className="dock-badge">{badge > 99 ? "99+" : badge}</span>
      )}
    </button>
  );
}
