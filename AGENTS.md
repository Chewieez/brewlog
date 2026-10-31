# Project Guidelines & Agent Instructions

## Browser Automation & Testing
- **Prerequisites (Fresh Environments):** If running in a new clone or container without cached browser binaries, install Chromium first:
  ```bash
  npx playwright install chromium
  ```
- **Default to Playwright:** For all browser automation, UI verification, visual checks, and end-to-end testing, write and run Playwright scripts via terminal commands (scoped to `apps/web` or via `npm run test:e2e`).
- **Interactive Modes:** For visual inspections and debugging, use `npm run test:e2e:headed` (visible Chrome window) or `npm run test:e2e:ui` (interactive UI mode).
- **DevTools MCP:** Only use the Chrome DevTools MCP server if the user explicitly requests MCP.
