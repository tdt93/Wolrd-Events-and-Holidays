export const SITE_NAME = "FestSeekr";
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? "https://festseekr.tdtdev.net"
).replace(/\/$/, "");
export const REPO_URL =
  import.meta.env.VITE_REPO_URL ??
  "https://github.com/tdt93/Wolrd-Events-and-Holidays";

export const DISCLAIMER = `FestSeekr helps travelers and curious explorers discover global festivals, holidays, and ticketed events on an interactive map.

Data comes from public APIs (Nager.Date, Ticketmaster, SeatGeek, and others). Always verify dates and venues before booking travel.`;
