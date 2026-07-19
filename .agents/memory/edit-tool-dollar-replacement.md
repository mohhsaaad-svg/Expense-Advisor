---
name: Edit tool mangles $' and $& in new_string
description: Why inserting currency symbols via Edit corrupted a file, and how to avoid it
---

The Edit tool's `new_string` is applied with JS `String.replace`-style semantics: the sequences `$'` (text after match), `$&` (the match), and `$\`` (text before match) are expanded, not inserted literally.

**Why:** Inserting `USD: '$',` into a TS file duplicated large chunks of the file (the `$'` expanded to everything after the match), producing dozens of syntax errors.

**How to apply:** When replacement text contains `$` adjacent to quotes or backticks (currency symbol maps, template-literal examples, regex source), use WriteFile to rewrite the whole file instead of Edit. `$` alone followed by other chars (e.g. `${`) has been safe; the dangerous cases are `$'`, `` $` ``, `$&`.
