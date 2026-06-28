# FestSeekr — Global festivals, holidays & events

Interactive world map for exploring public holidays by country. Built with Vite, React, MapLibre GL, deck.gl, and Nager.Date.

**Live:** https://festseekr.tdtdev.net/

## Development

```powershell
# Terminal 1 — API proxy
npm run dev:api

# Terminal 2 — frontend
npm run dev
```

Open http://localhost:5173

## Build

```powershell
npm run build
npm run preview
```

## Docker

```powershell
docker build -t festseekr .
docker run --rm -p 8080:80 festseekr
# http://localhost:8080/health  →  ok
```

## Deploy

Same image-based flow as [My-site](https://github.com/tdt93/My-site):

1. Push to `main` → CI builds, health-checks, pushes `ghcr.io/tdt93/wolrd-events-and-holidays`
2. CI pins `Docker-deployment/festseekr/Dockerfile`
3. Coolify deploys from `Docker-deployment`, base directory **`festseekr`**

**Secrets:** `DEPLOY_REPO_TOKEN` in this repo (PAT with write access to `Docker-deployment`).

**Coolify:** https://festseekr.tdtdev.net/ — port **80**, health check **`/health`** on port **80**, optional env vars from `.env.example`.

## Features

- Light Sunny atlas UI with globe / flat map toggle
- Click country → fly-to and load holidays
- Category filters, date presets, national-only, long weekends
- Near me (geolocation), watchlist, trip planner
- World heatmap by holiday density
- Ticketmaster + SeatGeek + API-Football football fixtures (optional API keys; free API-Football tier uses 2022–2024 seasons)
- Festivo + Calendarific holidays merged with Nager.Date (optional `FESTIVO_API_KEY`, `CALENDARIFIC_API_KEY`)

## API routes

| Route | Description |
|-------|-------------|
| GET /api/countries | Available countries (Nager.Date) |
| GET /api/holidays/:code?year=&lang= | Public holidays (Nager + Festivo + Calendarific if keys set) |
| GET /api/holidays/heatmap?year=&from=&to= | Holiday counts by country |
| GET /api/events/:code?from=&to= | Ticketmaster, SeatGeek, API-Football (if keys set) |
