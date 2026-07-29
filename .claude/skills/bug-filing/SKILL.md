---
name: bug-filing
description: File a Bugzilla bug for Firefox/Gecko work, or draft a bug summary and description. Use when the user asks to file a bug, wants a bug summary/description for a change, or needs to report a defect/enhancement/task. Determines the product and component with `mach file-info`, drafts the summary and description, and opens a prefilled enter_bug.cgi form in the browser for the user to submit.
allowed-tools:
  - Bash(./mach file-info:*)
  - Bash(python3 .agents/skills/bug-filing/file-bug.py:*)
  - Bash(python3 .claude/skills/bug-filing/file-bug.py:*)
---

## Overview

File a Mozilla bug by opening a prefilled Bugzilla "enter bug" form in the user's
browser. The skill picks the right component automatically, drafts a well-formatted
summary and description, and hands the form to the user to submit, so the bug is
created under their own account with a chance to review and adjust.

## Workflow

1. **Determine the product and component.** Run
   `./mach file-info bugzilla-component <file>` on a representative file the change
   touches. The output is `Product :: Component`; split on `::` for the `product`
   and `component` URL params.
   - If it returns `UNKNOWN`, pick the closest sensible component rather than
     leaving it blank.

2. **Choose the bug type** (per Mozilla's task/defect/enhancement guide):
   - `defect` — shipping software is not behaving as expected: a regression, a crash, an error.
   - `enhancement` — a new feature or function, or changing how an existing feature behaves.
   - `task` — change a configuration, update a parameter, or refactor existing code;
     engineering changes with no user-facing behavior change (tooling, tests, docs, build).

3. **Draft the summary and description and show them to the user.**
   - Keep the summary short and specific.
   - In the description, wrap code identifiers (function, variable, class, file,
     pref, and flag names) in backticks so they render as code in the filed bug.
   - For a test-failure bug, include a link to the test's dashboard:
     `https://tests.firefox.dev/test.html?test=<path>`.

4. **Confirm with the user before filing.** Ask for approval using the
   `AskUserQuestion` tool, with "Looks good, file the bug" as the first (recommended)
   option so the user can accept it with a single keypress; the automatic "Other"
   choice lets them request edits instead. Do not run the script until they approve.

5. **Open the prefilled form.** Run the helper script with each Bugzilla
   `enter_bug.cgi` field as a `field=value` argument; it URL-encodes the values and
   opens the form in the browser (cross-platform, so Linux, macOS, and Windows all work):
   ```
   python3 .agents/skills/bug-filing/file-bug.py product=<P> component=<C> \
       bug_type=<T> short_desc=<summary> comment=<description>
   ```
   - Write `short_desc` and `comment` as plain text, with markdown backticks around
     code identifiers; the script does all the encoding.
   - Any form field works, so add more as the bug needs them, e.g. `blocked=<bug>`
     (blocks), `dependson=<bug>` (depends on), or `see_also=<url>`.

   The user reviews and submits the form to create the bug, then provides the bug number.

## Notes

- This skill only opens a prefilled form; it never submits the bug itself.
