interface SiteLogoProps {
  size?: number;
  className?: string;
}

export function SiteLogo({ size = 32, className = "" }: SiteLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt=""
      width={size}
      height={size}
      className={`site-logo${className ? ` ${className}` : ""}`}
      aria-hidden="true"
      decoding="async"
    />
  );
}
