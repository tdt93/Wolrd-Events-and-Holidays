import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const DEFAULT_SITE_URL = "https://festseekr.tdtdev.net";

function siteUrl(): string {
  return (process.env.VITE_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/$/, "");
}

function robotsTxt(url: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${url}/sitemap.xml
`;
}

function sitemapXml(url: string): string {
  const lastmod = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${url}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

export function seoStaticPlugin(): Plugin {
  return {
    name: "seo-static",
    closeBundle() {
      const url = siteUrl();
      const outDir = resolve("dist");
      writeFileSync(resolve(outDir, "robots.txt"), robotsTxt(url), "utf8");
      writeFileSync(resolve(outDir, "sitemap.xml"), sitemapXml(url), "utf8");
    },
  };
}
