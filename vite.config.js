import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        game: "index.html",
        units: "unit-preview/index.html",
        animals: "animal-preview/index.html",
      },
    },
  },
  server: {
    proxy: { "/api": { target: "http://127.0.0.1:8080", changeOrigin: true } },
  },
});
