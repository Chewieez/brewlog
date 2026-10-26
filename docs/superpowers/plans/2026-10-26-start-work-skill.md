# `start-work` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a cross-terminal `start-work` skill for Antigravity CLI in `dotfiles` that fetches GitHub issues, updates and branches from `origin/main` or `origin/dev`, creates a `.worktrees/<branch>` worktree, and launches a newly titled session tab in Orca or iTerm2.

**Architecture:** A lightweight executable launcher script (`launch-worktree-tab.sh`) handles terminal detection (Orca vs iTerm2), tab creation, titling, and session launching with an initial prompt. The core skill (`SKILL.md`) directs Antigravity CLI through issue resolution via `gh`, base branch synchronization, worktree creation, calling the launcher script, and presenting the handoff card. Symlinked into `~/.agents/skills/start-work` via `dotfiles/install.sh`.

**Tech Stack:** Bash, GitHub CLI (`gh`), Git worktrees, Orca CLI (`orca`), AppleScript (`osascript` for iTerm2), Antigravity CLI (`agy`).

**Spec:** [docs/superpowers/specs/2026-10-26-start-work-skill-design.md](file:///Users/greglawrence/Projects/brewlog/docs/superpowers/specs/2026-10-26-start-work-skill-design.md)

## Global Constraints

- **Terminal Support:** Must support Orca (`TERM_PROGRAM=Orca` or `$ORCA_TAB_ID`) and iTerm2 (`TERM_PROGRAM=iTerm.app` or `$LC_TERMINAL=iTerm2`) with graceful fallback.
- **Base Branch Rule:** Always synchronize and branch from the latest remote state (`origin/main` or `origin/dev`), never an outdated local checkout.
- **Worktree Location:** Strictly `<repo_root>/.worktrees/<branch_name>`, ensuring `.worktrees/` is gitignored.
- **Issue Tracking:** GitHub Issues only via `gh` CLI or ad-hoc tasks; no Jira or sprint requirements.
- **No Emoji:** House design doctrine rule (zero emoji anywhere in scripts, skill text, or output messages).

---

### Task 1: Create the Terminal Launcher Helper Script

**Files:**
- Create: `/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/launch-worktree-tab.sh`
- Test: `/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh`

**Interfaces:**
- Consumes:
  - `--dir <path>`: Absolute directory of the worktree.
  - `--title <title>`: Tab title string.
  - `--prompt <prompt>`: Initial seed prompt for `agy`.
  - `--dry-run`: Prints resolved terminal and command without spawning tabs.
- Produces:
  - Exit code `0` on successful tab dispatch.
  - Exit code `1` on invalid arguments or execution failure.

- [ ] **Step 1: Write the test script for `launch-worktree-tab.sh`**

Create `/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAUNCHER="$SCRIPT_DIR/launch-worktree-tab.sh"

echo "=== Test 1: Missing required arguments should fail ==="
if "$LAUNCHER" 2>/dev/null; then
  echo "FAIL: Expected failure with no arguments"
  exit 1
else
  echo "PASS: Failed as expected on missing arguments"
fi

echo "=== Test 2: Dry-run in current environment ==="
OUTPUT=$("$LAUNCHER" --dir "/tmp/test-wt" --title "TEST #1" --prompt "Hello world" --dry-run)
echo "$OUTPUT"

if [[ "$OUTPUT" != *"DRY RUN"* ]]; then
  echo "FAIL: Expected DRY RUN in output"
  exit 1
fi
echo "PASS: Dry run executed successfully"
```
Make it executable:
```bash
chmod +x /Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh
```
Expected: FAIL with "launch-worktree-tab.sh: No such file or directory"

- [ ] **Step 3: Implement `launch-worktree-tab.sh`**

Create `/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/launch-worktree-tab.sh`:
```bash
#!/usr/bin/env bash
# launch-worktree-tab.sh — Create a new terminal tab in Orca or iTerm2,
# name the tab, and start Antigravity CLI in the specified worktree.
set -euo pipefail

WORKTREE_DIR=""
TAB_TITLE=""
PROMPT_TEXT=""
DRY_RUN=false

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]
Options:
  -d, --dir <path>       Worktree directory path (required)
  -t, --title <title>    Tab title (required)
  -p, --prompt <prompt>  Initial seed prompt for agy (required)
  --dry-run              Print the resolved command without executing
  -h, --help             Show this help message
EOF
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--dir)
      WORKTREE_DIR="$2"
      shift 2
      ;;
    -t|--title)
      TAB_TITLE="$2"
      shift 2
      ;;
    -p|--prompt)
      PROMPT_TEXT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

if [[ -z "$WORKTREE_DIR" || -z "$TAB_TITLE" || -z "$PROMPT_TEXT" ]]; then
  echo "Error: --dir, --title, and --prompt are all required." >&2
  usage
fi

# Detect terminal program
DETECTED_TERM="unknown"
if [[ "${TERM_PROGRAM:-}" == "Orca" || -n "${ORCA_TAB_ID:-}" || -n "${ORCA_TERMINAL_HANDLE:-}" ]]; then
  DETECTED_TERM="orca"
elif [[ "${TERM_PROGRAM:-}" == "iTerm.app" || "${LC_TERMINAL:-}" == "iTerm2" ]]; then
  DETECTED_TERM="iterm"
elif [[ "${TERM_PROGRAM:-}" == "Apple_Terminal" ]]; then
  DETECTED_TERM="terminal"
fi

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN:"
  echo "  Terminal: $DETECTED_TERM"
  echo "  Worktree: $WORKTREE_DIR"
  echo "  Title:    $TAB_TITLE"
  echo "  Prompt:   $PROMPT_TEXT"
  exit 0
fi

# Clean and escape the prompt for CLI injection
ESCAPED_PROMPT=$(printf '%s' "$PROMPT_TEXT" | sed 's/"/\\"/g')

case "$DETECTED_TERM" in
  orca)
    if ! command -v orca >/dev/null 2>&1; then
      echo "Error: orca command line tool not found in PATH." >&2
      echo "Manual command: cd \"$WORKTREE_DIR\" && agy -i \"$ESCAPED_PROMPT\""
      exit 1
    fi
    orca terminal create \
      --worktree "path:$WORKTREE_DIR" \
      --title "$TAB_TITLE" \
      --command "agy -i \"$ESCAPED_PROMPT\"" \
      --focus
    ;;

  iterm)
    osascript <<APPLESCRIPT
if application "iTerm" is running then
  tell application "iTerm"
    tell current window
      set newTab to (create tab with default profile)
      tell current session of newTab
        set name to "$TAB_TITLE"
        write text "cd \"$WORKTREE_DIR\" && agy -i \"$ESCAPED_PROMPT\""
      end tell
    end tell
    activate
  end tell
end if
APPLESCRIPT
    ;;

  terminal)
    osascript <<APPLESCRIPT
if application "Terminal" is running then
  tell application "Terminal"
    activate
    tell application "System Events" to tell process "Terminal" to keystroke "t" using command down
    delay 0.5
    do script "cd \"$WORKTREE_DIR\" && agy -i \"$ESCAPED_PROMPT\"" in front window
    set custom title of front tab of front window to "$TAB_TITLE"
  end tell
end if
APPLESCRIPT
    ;;

  *)
    echo "Notice: Unrecognized terminal environment ($TERM_PROGRAM)."
    echo "Please open a new tab manually and execute:"
    echo "  cd \"$WORKTREE_DIR\" && agy -i \"$ESCAPED_PROMPT\""
    ;;
esac
```
Make it executable:
```bash
chmod +x /Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/launch-worktree-tab.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
/Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh
```
Expected: PASS

- [ ] **Step 5: Clean up test script and commit in dotfiles**

```bash
rm /Users/greglawrence/Projects/dotfiles/skills/start-work/scripts/test-launch-tab.sh
git -C /Users/greglawrence/Projects/dotfiles add skills/start-work/scripts/launch-worktree-tab.sh
git -C /Users/greglawrence/Projects/dotfiles commit -m "feat(skills): add launch-worktree-tab helper script for start-work"
```

---

### Task 2: Create the `start-work` Skill Definition (`SKILL.md`)

**Files:**
- Create: `/Users/greglawrence/Projects/dotfiles/skills/start-work/SKILL.md`

**Interfaces:**
- Consumes:
  - User command: `/start-work [#issue]` or natural language "start work on ...".
  - GitHub CLI (`gh`).
  - Git remote tracking branches (`origin/main`, `origin/dev`).
  - Helper script `launch-worktree-tab.sh`.
- Produces:
  - Created Git worktree at `.worktrees/<branch>`.
  - Dispatched terminal tab running `agy`.
  - User-facing summary card in initiating terminal.

- [ ] **Step 1: Write `SKILL.md` with complete instructions**

Create `/Users/greglawrence/Projects/dotfiles/skills/start-work/SKILL.md`:
```markdown
---
name: start-work
description: Use when the user wants to start work on a GitHub issue or ad-hoc task, create an isolated git worktree, and move the AI session into that worktree in a newly titled tab in Orca or iTerm.
---

# Start Work: Worktree & AI Session Lifecycle

Provides an automated procedure to pick up a GitHub issue (or ad-hoc task), ensure the local workspace branches off the latest remote `main` or `dev` branch, create an isolated `.worktrees/` environment, and transition the AI session into a new tab in Orca or iTerm2.

---

## 1. Verify Repository & Git Root

Confirm you are in a Git repository and find the top-level directory:
```bash
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
```
If not inside a Git repository, halt and inform the user.

---

## 2. Resolve Base Branch & Fetch Latest Remote Changes

Always branch from the latest remote state:
1. Identify the default base branch:
   ```bash
   if git show-ref --verify --quiet refs/remotes/origin/dev; then
     BASE_BRANCH="dev"
   elif git show-ref --verify --quiet refs/remotes/origin/main; then
     BASE_BRANCH="main"
   else
     BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')
   fi
   ```
2. Pull the latest commits for this base branch from the remote:
   ```bash
   git fetch origin "$BASE_BRANCH"
   # If local tracking branch exists, fast-forward it if possible
   git fetch origin "$BASE_BRANCH":"$BASE_BRANCH" 2>/dev/null || true
   ```

---

## 3. Resolve Issue Context

### Scenario A: Issue Number or URL Provided
If the user provided an issue number (e.g. `#52`, `52`, or a GitHub issue URL):
```bash
ISSUE_JSON=$(gh issue view <number> --json number,title,body,url,labels)
```
Extract:
- `ISSUE_NUM`: `.number`
- `ISSUE_TITLE`: `.title`
- `ISSUE_BODY`: `.body`

### Scenario B: No Argument Provided
1. Query the 10 most recent open issues:
   ```bash
   gh issue list --state open --limit 10
   ```
2. Ask the user via `ask_question` which issue they want to work on, or if they want to enter a custom ad-hoc task.

### Scenario C: Ad-Hoc Task (No GitHub Issue)
If working without a GitHub issue, prompt for a brief description (e.g. "theme-token-refactor"):
- `ISSUE_NUM` is empty.
- `ISSUE_TITLE` is the user-provided title.
- `ISSUE_BODY` is a short summary of the intended work.

---

## 4. Compute Branch Name & Worktree Path

1. Slugify the title:
   ```bash
   SLUG=$(printf '%s' "$ISSUE_TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | sed -E 's/^-+|-+$//g' | cut -c 1-40 | sed -E 's/-+$//')
   ```
2. Format branch and tab names:
   - With Issue:
     - `BRANCH_NAME="${ISSUE_NUM}-${SLUG}"`
     - `TAB_TITLE="#${ISSUE_NUM}: $(printf '%s' "$ISSUE_TITLE" | cut -c 1-28)"`
   - Ad-Hoc:
     - `BRANCH_NAME="task/${SLUG}"`
     - `TAB_TITLE="Task: $(printf '%s' "$ISSUE_TITLE" | cut -c 1-26)"`
3. Worktree path:
   ```bash
   WORKTREE_PATH="$REPO_ROOT/.worktrees/$BRANCH_NAME"
   ```

---

## 5. Ensure Worktree Ignore Safety

Verify `.worktrees/` is ignored by Git before creating the worktree:
```bash
if ! git check-ignore -q .worktrees 2>/dev/null; then
  echo ".worktrees/" >> "$REPO_ROOT/.gitignore"
  git -C "$REPO_ROOT" add .gitignore
  git -C "$REPO_ROOT" commit -m "chore: ignore .worktrees/ directory"
fi
```

---

## 6. Create the Git Worktree

Check existing worktrees and branches:
```bash
if git worktree list | grep -q "$WORKTREE_PATH"; then
  echo "Worktree already exists at $WORKTREE_PATH. Reusing."
elif git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  git worktree add "$WORKTREE_PATH" "$BRANCH_NAME"
else
  # Base directly off latest fetched remote base branch
  git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "origin/$BASE_BRANCH"
fi
```

Copy local environment overrides if present:
```bash
if [[ -f "$REPO_ROOT/.env.local" ]]; then
  cp "$REPO_ROOT/.env.local" "$WORKTREE_PATH/.env.local"
fi
```

---

## 7. Launch Session Tab

1. Construct the seed prompt for the new session:
   - With Issue:
     ```text
     I am starting work on issue #<ISSUE_NUM>: <ISSUE_TITLE>.
     Description:
     <ISSUE_BODY>
     Please explore the codebase, plan the approach, and brainstorm the design before implementation.
     ```
   - Ad-Hoc:
     ```text
     I am starting work on task: <ISSUE_TITLE>.
     <ISSUE_BODY>
     Please explore the codebase, plan the approach, and brainstorm the design before implementation.
     ```

2. Invoke the launcher helper script:
   ```bash
   SCRIPT_PATH="$HOME/.agents/skills/start-work/scripts/launch-worktree-tab.sh"
   "$SCRIPT_PATH" --dir "$WORKTREE_PATH" --title "$TAB_TITLE" --prompt "$SEED_PROMPT"
   ```

---

## 8. Handoff & Completion

Print a concise completion card in the current session and stop calling tools:

```text
=============================================================
  Worktree Created:  .worktrees/<BRANCH_NAME>
  Branch:            <BRANCH_NAME> (based on origin/<BASE_BRANCH>)
  Terminal Tab:      <TAB_TITLE>
  Session:           Launched and focused
=============================================================
Switch over to your new tab to continue work.
```
```

- [ ] **Step 2: Commit `SKILL.md` in dotfiles**

```bash
git -C /Users/greglawrence/Projects/dotfiles add skills/start-work/SKILL.md
git -C /Users/greglawrence/Projects/dotfiles commit -m "feat(skills): add start-work skill definition"
```

---

### Task 3: Link Skill Globally via `dotfiles/install.sh`

**Files:**
- Execute: `/Users/greglawrence/Projects/dotfiles/install.sh`

**Interfaces:**
- Consumes: `~/Projects/dotfiles/skills/start-work`
- Produces: Symlink at `~/.agents/skills/start-work` -> `~/Projects/dotfiles/skills/start-work`

- [ ] **Step 1: Run `install.sh` in dotfiles**

Run:
```bash
/Users/greglawrence/Projects/dotfiles/install.sh
```
Expected output: Contains `LINK  /Users/greglawrence/.agents/skills/start-work -> /Users/greglawrence/Projects/dotfiles/skills/start-work` (or `OK`).

- [ ] **Step 2: Verify symlink integrity**

Run:
```bash
ls -ld ~/.agents/skills/start-work
readlink ~/.agents/skills/start-work
```
Expected: Points directly to `/Users/greglawrence/Projects/dotfiles/skills/start-work`.

---

### Task 4: End-to-End Verification

**Files:**
- Verify execution of `launch-worktree-tab.sh` in live Orca environment.

- [ ] **Step 1: Test `launch-worktree-tab.sh --dry-run` via symlinked path**

Run:
```bash
~/.agents/skills/start-work/scripts/launch-worktree-tab.sh \
  --dir "/Users/greglawrence/Projects/brewlog" \
  --title "#52: Edit Water Target" \
  --prompt "Test prompt" \
  --dry-run
```
Expected: Prints `DRY RUN:`, detects `Terminal: orca`, and confirms arguments without error.

- [ ] **Step 2: Test live tab creation in Orca**

Run:
```bash
~/.agents/skills/start-work/scripts/launch-worktree-tab.sh \
  --dir "/Users/greglawrence/Projects/brewlog" \
  --title "TEST TAB #99" \
  --prompt "echo 'tab verification successful'"
```
Verify:
1. A new tab opens in Orca.
2. The tab is titled `TEST TAB #99`.
3. The new tab is focused.

- [ ] **Step 3: Close the test terminal tab in Orca**

Close the test terminal via Orca UI or CLI:
```bash
orca terminal list --json
# locate test terminal handle and close if desired, or let user close
```

- [ ] **Step 4: Commit implementation plan in `brewlog`**

```bash
git add docs/superpowers/plans/2026-10-26-start-work-skill.md
git commit -m "docs: add implementation plan for start-work skill"
```
