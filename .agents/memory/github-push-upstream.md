---
name: gitPush upstream workaround
description: How to push main to the user's GitHub when the gitPush callback refuses due to branch tracking config.
---

# Pushing main to GitHub in this workspace

**Rule:** To push `main` to the user's GitHub repo, temporarily set `main`'s upstream to `origin/main`, run the `gitPush` callback, then restore the upstream to its original subrepl remote. Do not leave the upstream changed and do not delete/rename subrepl remotes.

**Why:** `main` tracks a subrepl remote (task-agent plumbing that must stay). The `gitPush` callback fails with "already tracks <subrepl>/main; cannot publish" when tracking points elsewhere, and with `BRANCH_ALREADY_EXISTS` when the branch has no upstream but exists on GitHub. Plain `git push` from the shell fails too: there is no credential helper — GitHub credentials only exist inside the `gitPush` callback.

**How to apply:**
1. `git remote add origin <github url>` if `origin` is missing (one subrepl remote may already hold the GitHub URL — leave it alone).
2. `git fetch origin main && git branch --set-upstream-to=origin/main main`
3. `gitPush({})` via CodeExecution (uses the user's Replit GitHub connection).
4. Restore: `git branch --set-upstream-to=<original subrepl>/main main`.
