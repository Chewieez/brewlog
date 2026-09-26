import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../core/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
