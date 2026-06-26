import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { geocodeDevMiddleware } from "./vite.geocode.js";

export default defineConfig({
  plugins: [
    {
      name: "geocode-dev-fallback",
      enforce: "pre",
      configureServer(server) {
        server.middlewares.use(geocodeDevMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(geocodeDevMiddleware());
      },
    },
    react(),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("maplibre-gl")) return "maplibre";
          if (
            id.includes("@deck.gl") ||
            id.includes("@luma.gl") ||
            id.includes("@loaders.gl")
          ) {
            return "deck-stack";
          }
        },
      },
    },
  },
});
