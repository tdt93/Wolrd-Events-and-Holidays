# Sunny Atlas — Global Holidays Map

Interactive world map for exploring public holidays by country. Built with Vite, React, MapLibre GL, deck.gl, and Nager.Date.

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
docker build -t sunny-atlas .
docker run --rm -p 8080:80 sunny-atlas
```

## Features

- Light Sunny atlas UI with globe / flat map toggle
- Click country → fly-to and load holidays
- Category filters, date presets, national-only, long weekends
- Near me (geolocation), watchlist, trip planner
- World heatmap by holiday density
- Timeline day filter, .ics export
- Ticketmaster events layer (optional TICKETMASTER_API_KEY)

## API routes

| Route | Description |
|-------|-------------|
| GET /api/countries | Available countries (Nager.Date) |
| GET /api/holidays/:code?year= | Public holidays per country |
| GET /api/holidays/heatmap?year=&from=&to= | Holiday counts by country |
| GET /api/events/:code | Ticketmaster events (if API key set) |
