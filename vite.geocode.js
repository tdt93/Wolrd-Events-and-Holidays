import { searchGeocode, reverseGeocode } from "./server/geocodeProxy.js";

function readQuery(url) {
  const parsed = new URL(url, "http://localhost");
  return parsed.searchParams;
}

export function geocodeDevMiddleware() {
  return async (req, res, next) => {
    const pathname = req.url?.split("?")[0] ?? "";
    if (pathname !== "/api/geocode/search" && pathname !== "/api/geocode/reverse") {
      next();
      return;
    }

    try {
      const params = readQuery(req.url ?? "");
      res.setHeader("Content-Type", "application/json");

      if (pathname === "/api/geocode/search") {
        const q = params.get("q") || "";
        const countryCode = params.get("countryCode") || "";
        const data = await searchGeocode(q, countryCode);
        res.statusCode = 200;
        res.end(JSON.stringify(data));
        return;
      }

      const lat = params.get("lat") || "";
      const lon = params.get("lon") || "";
      if (!lat || !lon) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "missing_coords" }));
        return;
      }

      const data = await reverseGeocode(lat, lon);
      res.statusCode = 200;
      res.end(JSON.stringify(data));
    } catch (err) {
      res.statusCode = 502;
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : "upstream_failed",
        }),
      );
    }
  };
}
