import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
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
