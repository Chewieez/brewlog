# Design Spec: `start-work` Skill for Antigravity CLI

**Date**: 2026-10-26  
**Status**: Approved (Design Phase)  
**Target Locations**: 
- `~/Projects/dotfiles/skills/start-work/SKILL.md`
- `~/Projects/dotfiles/skills/start-work/scripts/launch-worktree-tab.sh`
- Symlink via `~/Projects/dotfiles/install.sh` to `~/.agents/skills/start-work`

---

## 1. Overview & Goals

Provides an automated, single-invocation command (`/start-work [issue]` or natural language) in Antigravity CLI (`agy`) that replicates the developer workflow:
1. Resolves a GitHub issue via the GitHub CLI (`gh`), or prompts for an open issue / ad-hoc task title.
2. Identifies the project base branch (`main` or `dev`), fetches latest changes from `origin`, and ensures the new branch starts strictly from the latest remote state.
3. Creates a new Git worktree under `.worktrees/<branch-name>`, ensuring `.worktrees/` is properly ignored in `.gitignore`.
4. Copies any essential local untracked configs (e.g. `.env.local`) into the worktree if present.
5. Launches a new terminal tab in **Orca** or **iTerm2**, labels the tab (e.g. `#52: Edit Water Target`), changes directory into the worktree, and starts `agy` seeded with the issue brief.
6. Gracefully prints the handoff details and completes the initiator session.

---

## 2. Issue Resolution & Naming Conventions

### 2.1 Issue Discovery
- **With Argument** (e.g. `/start-work #52`, `/start-work 52`, or issue URL):
  ```bash
  gh issue view <number> --json number,title,body,url,labels
  ```
- **Without Argument**:
  Query recent open issues:
  ```bash
  gh issue list --state open --limit 10 --json number,title,labels
  ```
  Prompt the user via multiple-choice question to pick an issue or input a custom ad-hoc task.
- **Ad-Hoc Task**:
  Prompts for a short task description (e.g. `reorganize-theme-tokens`).

### 2.2 Branch & Directory Naming
- **Slug generation**:
  Lowercase alphanumeric, convert spaces/punctuation to hyphens, collapse consecutive hyphens, truncate to ~40 characters.
- **Branch format**:
  - Issue: `<issue_number>-<slug>` (e.g. `52-edit-water-target-and-ratio-mobile`)
  - Ad-hoc: `task/<slug>`
- **Worktree path**:
  `<repo_root>/.worktrees/<branch_name>`

---

## 3. Workspace / Worktree Creation & Synchronization

### 3.1 Base Branch Determination
1. Determine the base branch:
   - Check if `origin/dev` exists. If the repo uses `dev` as its development branch, select `dev`.
   - Check if `origin/main` exists. If so, select `main`.
   - Fall back to remote default branch: `git symbolic-ref refs/remotes/origin/HEAD`.
2. Fetch the latest remote changes:
   ```bash
   git fetch origin "$BASE_BRANCH"
   ```
3. If local tracking branch `$BASE_BRANCH` exists and can fast-forward, update it cleanly without checking it out:
   ```bash
   git fetch origin "$BASE_BRANCH":"$BASE_BRANCH" 2>/dev/null || true
   ```

### 3.2 Workspace / Worktree Creation

#### In Orca (Dedicated Workspace)
If inside Orca (`$TERM_PROGRAM == "Orca"` or `$ORCA_TAB_ID` present):
1. Check if an Orca workspace already exists for this branch:
   ```bash
   EXISTING_WT=$(orca worktree list --json 2>/dev/null | jq -r --arg b "$BRANCH_NAME" '.result.worktrees[] | select(.branch == "refs/heads/" + $b or .branch == "refs/heads/Chewieez/" + $b or .displayName == $b) | .path' | head -1)
   ```
2. If it exists, activate it.
3. If new, create the first-class Orca workspace:
   ```bash
   CREATE_RES=$(orca worktree create \
     --name "$BRANCH_NAME" \
     --base-branch "$BASE_BRANCH" \
     ${ISSUE_NUM:+--issue "$ISSUE_NUM"} \
     --activate \
     --json)
   WORKTREE_PATH=$(echo "$CREATE_RES" | jq -r '.result.worktree.path')
   ```

#### Outside Orca (iTerm2 / Terminal.app)
1. Check `.gitignore` for `.worktrees/`:
   ```bash
   git check-ignore -q .worktrees 2>/dev/null || {
     echo ".worktrees/" >> .gitignore
     git add .gitignore && git commit -m "chore: ignore .worktrees/ directory"
   }
   ```
2. Check existing branches and worktrees:
   - If worktree already exists at `.worktrees/<branch_name>`, reuse it.
   - If branch exists:
     ```bash
     git worktree add ".worktrees/$BRANCH_NAME" "$BRANCH_NAME"
     ```
   - If new branch, base directly off `origin/$BASE_BRANCH`:
     ```bash
     git worktree add ".worktrees/$BRANCH_NAME" -b "$BRANCH_NAME" "origin/$BASE_BRANCH"
     ```

#### Environment Forwarding (Both Environments)
Copy local environment overrides if present:
```bash
[ -f "$REPO_ROOT/.env.local" ] && cp "$REPO_ROOT/.env.local" "$WORKTREE_PATH/.env.local" || true
```

---

## 4. Terminal Tab Dispatching (`launch-worktree-tab.sh`)

### 4.1 Interface
The launcher script is located at:
`~/Projects/dotfiles/skills/start-work/scripts/launch-worktree-tab.sh`

Usage:
```bash
launch-worktree-tab.sh --dir "<absolute_worktree_path>" --title "<tab_title>" --prompt "<seed_prompt>"
```

### 4.2 Terminal Detection & Execution

#### Orca Detection & Dispatch
- **Detection**: `[ "$TERM_PROGRAM" = "Orca" ] || [ -n "${ORCA_TAB_ID:-}" ] || [ -n "${ORCA_TERMINAL_HANDLE:-}" ]`
- **Execution**:
  ```bash
  orca terminal create \
    --worktree "path:$WORKTREE_PATH" \
    --title "$TAB_TITLE" \
    --command "agy -i \"$ESCAPED_PROMPT\"" \
    --focus
  ```

#### iTerm2 Detection & Dispatch
- **Detection**: `[ "$TERM_PROGRAM" = "iTerm.app" ] || [ "${LC_TERMINAL:-}" = "iTerm2" ]`
- **Execution**:
  Runs AppleScript to create a new tab in the active window, set the tab title, navigate to the worktree, and launch `agy`:
  ```applescript
  tell application "iTerm"
    tell current window
      set newTab to (create tab with default profile)
      tell current session of newTab
        set name to "$TAB_TITLE"
        write text "cd \"$WORKTREE_PATH\" && agy -i \"$ESCAPED_PROMPT\""
      end tell
    end tell
    activate
  end tell
  ```

#### Fallback
If neither Orca nor iTerm is detected, print the exact manual command:
```bash
cd "$WORKTREE_PATH" && agy -i "$SEED_PROMPT"
```

---

## 5. Seed Prompt Format

The initial prompt passed to the new `agy` session primes it with the full issue context:
```text
I am starting work on issue #52: <title>.
Issue details:
<description/body>
Please review the issue and requirements, explore the codebase, and brainstorm the design before implementation.
```

---

## 6. Handoff & Completion Output

The launcher session displays a clear summary card:
```text
=============================================================
  Worktree Created:  .worktrees/52-edit-water-target-mobile
  Branch:            52-edit-water-target-mobile (from origin/main)
  Terminal:          Orca (#52: Edit Water Target)
  Status:            Session launched and focused
=============================================================
Switch to your new tab to continue work.
```

---

## 7. Verification & Testing Plan

1. **Launcher Script Test**: Test `launch-worktree-tab.sh` in the current terminal (Orca) to ensure a new tab opens, names itself, and focuses properly.
2. **Dotfiles Symlink**: Run `dotfiles/install.sh` and verify `~/.agents/skills/start-work` is linked.
3. **Skill Triggering**: Verify Antigravity CLI sees `/start-work` and expands it cleanly.
4. **Issue & Worktree Flow**: Run dry-run / verification of branch creation and worktree addition against `origin/main`.
