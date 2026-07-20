---
name: Shell self-match trap (pkill/pgrep -f)
description: pkill/pgrep -f patterns match the invoking shell's own command line — pkill silently kills the calling shell; pgrep gives false "still running" when polling.
---

**Rule:** Never use a bare `pkill -f "<pattern>"` or `pgrep -f "<pattern>"` when the pattern text appears in the very command being executed (it always does when written inline in a multi-command shell call). Break the self-match with a character class (`pkill -f "scripts/[b]uild.js"`) or use `pgrep -f ... | grep -v $$`.

**Why:** The executed shell's `-c` command string contains the literal pattern, so `-f` matches it. `pkill` then kills the calling shell mid-script — observed as exit −1 with partial or no output, wasting whole rounds on phantom "harness" failures. `pgrep` polling returns the poller itself, reporting a long-dead background job as still running.

**How to apply:** Any time a long build/test runs detached (`setsid nohup ... &`) and later shell calls poll or clean up by process name — bracket one character of the pattern in every pkill/pgrep. Also beware patterns like "pnpm run build" that legitimately match other processes (a workflow's dev script may contain it).
