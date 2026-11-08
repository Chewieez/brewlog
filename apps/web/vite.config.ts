import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

const isSentryConfigured = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT
);

export default defineConfig({
  build: {
    sourcemap: isSentryConfigured ? "hidden" : false,
  },
  plugins: [
    react(),
    tailwindcss(),
    isSentryConfigured &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ["./dist/**/*.map"],
        },
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@brewlog/core": path.resolve(__dirname, "../../packages/core/src"),
      "@brewlog/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@brewlog/ui": path.resolve(__dirname, "../../packages/ui/src/index.web.ts"),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    open: false,
  },
});
