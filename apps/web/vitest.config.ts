import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../../packages/core/src"),
      "@brewlog/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});

