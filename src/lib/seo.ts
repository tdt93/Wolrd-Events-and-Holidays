import { SITE_NAME, SITE_URL } from "./config";

export const SITE_TAGLINE =
  "Discover global festivals, holidays, and ticketed events on an interactive doodle-style world map.";

export const SITE_DESCRIPTION =
  "FestSeekr — explore public holidays, festivals, sports, concerts, and ticketed events worldwide. Filter by country, date, and region on an interactive map.";

export const SITE_KEYWORDS =
  "festivals, holidays, world events, travel planner, public holidays, interactive map, global celebrations, ticketed events";

export const OG_IMAGE_PATH = "/og-image.svg";

export const OG_IMAGE_URL = `${SITE_URL}${OG_IMAGE_PATH}`;

export const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  image: OG_IMAGE_URL,
};
