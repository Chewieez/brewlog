# Project Guidelines & Agent Instructions

## Browser Automation & Testing
- **Prerequisites (Fresh Environments):** If running in a new clone or container without cached browser binaries, install Chromium first:
  ```bash
  npx playwright install chromium
  ```
- **Default to Playwright:** For all browser automation, UI verification, visual checks, and end-to-end testing, write and run Playwright scripts via terminal commands (scoped to `apps/web` or via `npm run test:e2e`).
- **Interactive Modes:** For visual inspections and debugging, use `npm run test:e2e:headed` (visible Chrome window) or `npm run test:e2e:ui` (interactive UI mode).
- **DevTools MCP:** Only use the Chrome DevTools MCP server if the user explicitly requests MCP.

## Documentation & PR Completion Protocol
Before opening, finalizing, or requesting review on any PR or completing a feature milestone, the agent MUST automatically perform the following documentation updates without requiring the user to prompt or ask:
1. **`README.md`**:
   - Update **Key Features** to document newly added capabilities, packages, and integrations.
   - Update **Environment Setup** / installation instructions if new environment variables (`.env`), credentials, or tools are introduced.
   - Remove completed items from **Upcoming Roadmap**.
2. **`docs/ROADMAP.md`**:
   - Move completed milestone items from `## In Progress & Upcoming Milestones` to `## Completed Milestones`.
   - Ensure all sub-tasks have their checkboxes marked as completed (`- [x]`).
   - Reference the issue number, PR number, and link to the corresponding devlog or ADR.
3. **`docs/devlogs/`**:
   - Create a comprehensive dated devlog (`docs/devlogs/YYYY-MM-DD-<phase-or-feature>.md`) covering:
     - Executive summary and problem statement
     - Architecture & cross-package deliverables
     - Privacy, security, or performance safeguards
     - Automated test and verification evidence
4. **Verification Evidence**:
   - Confirm all typechecks, unit tests, and Playwright E2E tests pass before committing and pushing.
