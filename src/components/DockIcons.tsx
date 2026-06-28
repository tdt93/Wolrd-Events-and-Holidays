const ICON = 24;

/** Slightly wobbly hand-drawn circle */
const DOODLE_RING =
  "M12 2.4c4.8.3 8.9 3.6 9.4 8.2.5 4.9-3.1 9.6-8 10.1-5.2.5-9.8-3.4-10.2-8.6C2.8 6.8 6.9 2.1 12 2.4z";

function DoodleFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="dock-icon dock-icon--doodle"
      width={ICON}
      height={ICON}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={DOODLE_RING}
        fill="rgba(255, 251, 235, 0.55)"
        stroke="rgba(245, 158, 11, 0.35)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {children}
      </g>
    </svg>
  );
}

/** Double-stroke sketch accent */
function SketchAccent({ d }: { d: string }) {
  return (
    <path
      d={d}
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      opacity="0.35"
    />
  );
}

export function IconFilter() {
  return (
    <DoodleFrame>
      <SketchAccent d="M5.2 7.3h13.4M6.8 12.1h10.2M8.6 16.7h6.6" />
      <path d="M5 7.5h14M7.2 12h9.6M9.4 16.5h5.2" />
      <circle cx="17.2" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16.5" r="1.1" fill="currentColor" stroke="none" />
    </DoodleFrame>
  );
}

export function IconList() {
  return (
    <DoodleFrame>
      <SketchAccent d="M6.3 5.2h11.2v13.8H6.3z" />
      <path
        d="M6.5 5.5h11c.6 0 1 .4 1 1v12.2c0 .5-.4.8-1 .8h-11c-.6 0-1-.3-1-.8V6.5c0-.6.4-1 1-1z"
        fill="rgba(255,255,255,0.45)"
      />
      <path d="M6.5 9.2h11M9 12.5h5.5M9 15.8h4" />
      <path d="M8.2 7.8h.9M8.4 7.6v.9" strokeWidth="1.4" />
    </DoodleFrame>
  );
}

export function IconHeatmap() {
  return (
    <svg
      className="dock-icon dock-icon--doodle"
      width={ICON}
      height={ICON}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={DOODLE_RING}
        fill="rgba(255, 251, 235, 0.55)"
        stroke="rgba(245, 158, 11, 0.35)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9.2"
        cy="10.2"
        r="2.7"
        fill="#fef08a"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="15.4"
        cy="9"
        r="3.1"
        fill="#fdba74"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="12.2"
        cy="15.2"
        r="2.9"
        fill="#fca5a5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M7.5 17.8c1.2-.8 2.6-1 4-1.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function IconSettings() {
  return (
    <DoodleFrame>
      <SketchAccent d="M12 5.2v2.1M12 16.7v2.1M5.2 12h2.1M16.7 12h2.1" />
      <circle cx="12" cy="12" r="2.6" fill="rgba(255,255,255,0.5)" />
      <path d="M12 4.8v2.4M12 16.8v2.4M4.8 12h2.4M16.8 12h2.4" />
      <path d="M6.6 6.6l1.7 1.7M15.7 15.7l1.7 1.7M17.4 6.6l-1.7 1.7M8.3 15.7l-1.7 1.7" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </DoodleFrame>
  );
}

export function IconInfo() {
  return (
    <DoodleFrame>
      <SketchAccent d="M12 5.2a6.8 6.8 0 100 13.6 6.8 6.8 0 000-13.6z" />
      <path d="M12 5.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13z" />
      <path d="M12 11.2v4.8" strokeWidth="2" />
      <circle cx="12" cy="8.4" r="1" fill="currentColor" stroke="none" />
    </DoodleFrame>
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
