import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../../packages/core/src"),
      "@brewlog/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@brewlog/ui": path.resolve(__dirname, "../../packages/ui/src/index.web.ts"),
    },
  },
  server: {
    port: 3000,
    open: false,
  },
});
