const ICON = 24;
const STROKE = "#475569";

function DockIconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={ICON}
      height={ICON}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="rgba(255, 255, 255, 0.38)"
        stroke="rgba(255, 255, 255, 0.72)"
        strokeWidth="1"
      />
      <g stroke={STROKE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

export function IconFilter() {
  return (
    <DockIconFrame>
      <path d="M5 7h14M7 12h10M9 17h6" />
    </DockIconFrame>
  );
}

export function IconList() {
  return (
    <DockIconFrame>
      <rect x="6" y="5" width="12" height="14" rx="1.5" fill="none" />
      <path d="M6 9h12" />
      <path d="M9 13h6M9 16h4" />
    </DockIconFrame>
  );
}

export function IconHeatmap() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="rgba(255, 255, 255, 0.38)"
        stroke="rgba(255, 255, 255, 0.72)"
        strokeWidth="1"
      />
      <circle cx="9" cy="10" r="2.5" fill="#fef08a" stroke={STROKE} strokeWidth="1.2" />
      <circle cx="15" cy="9" r="3" fill="#fb923c" stroke={STROKE} strokeWidth="1.2" />
      <circle cx="12" cy="15" r="2.8" fill="#f87171" stroke={STROKE} strokeWidth="1.2" />
    </svg>
  );
}

export function IconSettings() {
  return (
    <DockIconFrame>
      <circle cx="12" cy="12" r="2.5" fill="none" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4" />
    </DockIconFrame>
  );
}

export function IconInfo() {
  return (
    <DockIconFrame>
      <circle cx="12" cy="12" r="7" fill="none" />
      <path d="M12 11v5M12 8h.01" />
    </DockIconFrame>
  );
}

export function IconGitHub({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
