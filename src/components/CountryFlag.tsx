import { countryFlagUrl } from "../lib/flags";

interface CountryFlagProps {
  code: string | null | undefined;
  label?: string;
  size?: number;
}

export function CountryFlag({ code, label, size = 20 }: CountryFlagProps) {
  const url = countryFlagUrl(code);
  if (!url) return null;

  return (
    <img
      src={url}
      alt={label ? `${label} flag` : "Country flag"}
      className="country-flag-img"
      width={size}
      height={Math.round(size * 0.75)}
      loading="lazy"
      decoding="async"
    />
  );
}
