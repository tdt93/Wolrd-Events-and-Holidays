import type { ReactNode } from "react";

const ICON = 22;

function DoodleStroke({ children }: { children: ReactNode }) {
  return (
    <g
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {children}
    </g>
  );
}

export function IconDoodleGlobe() {
  return (
    <svg
      className="view-mode-icon view-mode-icon--doodle"
      width={ICON}
      height={ICON}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <DoodleStroke>
        <path
          d="M12 4.2a7.8 7.8 0 100 15.6 7.8 7.8 0 000-15.6z"
          fill="rgba(255,254,248,0.55)"
        />
        <path d="M4.4 12h15.2M12 4.2c-2.2 2.6-3.4 5.6-3.4 7.8s1.2 5.2 3.4 7.8c2.2-2.6 3.4-5.6 3.4-7.8s-1.2-5.2-3.4-7.8z" />
        <path d="M6.2 8.4h11.4M6.4 15.8h11" opacity="0.45" strokeWidth="1.8" />
      </DoodleStroke>
    </svg>
  );
}

export function IconDoodleFlatMap() {
  return (
    <svg
      className="view-mode-icon view-mode-icon--doodle"
      width={ICON}
      height={ICON}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <DoodleStroke>
        <path
          d="M5.2 6.8h13.4c.7 0 1.2.5 1.2 1.2v9.6c0 .6-.5 1.1-1.2 1.1H5.2c-.7 0-1.2-.5-1.2-1.1V8c0-.7.5-1.2 1.2-1.2z"
          fill="rgba(255,254,248,0.55)"
        />
        <path d="M8.8 6.5v12.2M15.2 6.5v12.2" />
        <path d="M5.8 10.2h12.2M5.8 14.2h12.2" opacity="0.45" strokeWidth="1.8" />
        <path d="M9.2 8.6l1.1 1M13.8 16.2l1 1.1" strokeWidth="1.6" opacity="0.35" />
      </DoodleStroke>
    </svg>
  );
}
