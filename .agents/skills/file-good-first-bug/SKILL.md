---
description: Use this skill when the user wants to file good-first-bugs in Bugzilla for Firefox. A good-first-bug is a narrow, self-contained, low-risk task scoped so a first-time contributor can land it without deep context. Sources include lint warnings, small typos, dead-code removal, mechanical refactors, docs conversions, or any other small task the user points at. Produces prefilled `enter_bug.cgi` URLs the user clicks to submit. Trigger on phrases like "file a good first bug", "open good first bugs for X", "create a good-first-bug from this".
---

## What is a good first bug

A bug a newcomer can pick up cold and finish in one short patch. The hallmarks:

- **Narrow scope** - one file or one tiny area. Multiple newcomers can work in parallel without conflict.
- **Self-contained** - the bug body contains everything: what to change, where to find it, how to reproduce / verify, and links to the contribution quickref. The contributor should not need to ask follow-up questions.
- **Low risk** - fix is mechanical or obvious. No design decisions, no API redesign, no cross-module reasoning.
- **Verifiable** - there's a clear signal the patch is correct (a lint that stops firing, a test that passes, a doc that renders, a warning that disappears).

Linter output is just one *source* of such tasks. Other good sources:

- A small typo or wording fix in code/docs the user spotted
- Removing one piece of dead code the user identified
- Converting one RST doc page to Markdown (or similar mechanical migration)
- Replacing one deprecated API call with its successor in a single file
- Adding a missing test for one small behavior
- Renaming one symbol consistently within a contained module

If the task touches many files, requires API design, or needs deep domain knowledge - it's **not** a good first bug. Push back on the user before filing.

## Workflow

1. **Understand the task source.** The user will point at something: a file, a lint output, a typo, a paragraph of docs, a deprecated call site. Read enough to confirm the work is genuinely narrow.

2. **Decide on bug shape.** Prefer **one bug per file / per atomic task**. Combine only if the user explicitly asks. Multiple small bugs let newcomers work in parallel and is the established Firefox precedent (e.g. bug 2031381).

3. **Propose to the user before filing.** Use `AskUserQuestion` to confirm scope and which items to file. Never generate bug URLs without explicit approval - filing bugs is user-visible.

4. **Generate prefilled `enter_bug.cgi` URLs.** There is no MCP tool to create Bugzilla bugs - the user submits each bug by clicking its URL. Use the URL builder below.

5. **Print the URLs**, one per item, prefixed with what the bug is about so the user can scan and click.

## Choosing product/component

Most Firefox good-first-bugs go to **Developer Infrastructure / Lint and Formatting** when they come from lint output, since that's the team that owns the trackers. For other sources, route to the component that owns the affected code:

- Docs conversions → the component of the docs (often `Developer Infrastructure / Source Documentation`)
- Code typos / dead-code → the component that owns the file
- API call-site updates → the component using the API

**Ask the user** if you're unsure - don't guess.

## Tracker bug

Good-first-bugs typically `blocks:` a tracker bug so the metawork is visible. Known trackers:

- clippy warnings → `1361342`
- ruff warnings → `1968295`
- Coverity issues → `1230156`
- clang-based static analysis → `712350`
- other linters → ask the user

For non-lint bugs there may or may not be a tracker. Ask the user; if there isn't one, omit `blocked`.

## Whiteboard

Set the Bugzilla whiteboard (`status_whiteboard`) to `[lang=LANGUAGE]` so newcomers can filter good-first-bugs by language. Use the full language name:

- Rust → `[lang=rust]`
- Python → `[lang=python]`
- JavaScript → `[lang=js]`
- C++ → `[lang=c++]`
- HTML / CSS → `[lang=html]` / `[lang=css]`
- Markdown / docs → `[lang=md]`

Pick the language of the file the contributor will actually edit. If a bug spans languages, list both: `[lang=rust][lang=python]`.

## Comment body template

The body must be self-sufficient. Adapt this skeleton:

```
Filing as a good first bug to learn workflows.

<one short paragraph: what to do and where>

<optional: warning list / code snippet / current vs. desired>

Link to the code:
https://searchfox.org/mozilla-central/source/<path>[#<line>]

To verify the fix:

<the exact command(s) the contributor should run, e.g.>
./mach lint -W -l clippy <path>
./mach test <path>
./mach doc --no-serve --no-open

<optional: brief note about why the change is desired>

Tutorial to contribute:
https://firefox-source-docs.mozilla.org/contributing/contribution_quickref.html
https://firefox-source-docs.mozilla.org/contributing/stack_quickref.html

Please don't ask for the bug to be assigned. It will be automatically assigned to the first patch.
```

The last paragraph (about auto-assignment) is canonical - keep it verbatim.

## URL builder

Use the helper script `scripts/build_url.py` (path relative to this skill file) to generate each prefilled `enter_bug.cgi` URL:

```bash
./scripts/build_url.py "<title>" "<comment>" --tracker 1361342 --lang rust
```

Run it with `--help` for the full list of options (`--product`, `--component`, `--tracker`, `--keywords`, `--lang`). It can also be imported and its `build_url()` function called directly.

## Example: lint warnings (canonical case)

This is the pattern bug 2031381 established. For each candidate file with 1-3 trivial warnings:

- Title: `Fix clippy warnings in <path>`
- Body lists the warnings, links searchfox at the first warning line, gives the `./mach lint -W -l clippy <path>` reproducer.
- Product/Component: `Developer Infrastructure / Lint and Formatting`
- Blocks: `1361342`

**Avoid these lints in good-first-bugs** unless the user explicitly accepts the extra scope:

- `clippy::too_many_arguments` - needs API refactoring
- `clippy::missing_safety_doc` - needs writing real Safety docs
- `clippy::type_complexity` - needs designing a `type` alias

Quick grouping of warnings by file:

```bash
awk '/^\// { f=$0; next } /warning/ { c[f]++; lines[f]=lines[f] "\n" $0 }
     END { for (f in c) if (c[f] <= 3) print c[f]"\t"f lines[f] }' clippy.txt | sort -n
```

## Example: typo fix

- Title: `Fix typo "recieve" in <path>`
- Body: quote the offending line(s), point at searchfox, give the corrected wording.
- Component: whatever owns `<path>`.
- No tracker unless the user names one.

## Example: docs conversion

- Title: `Convert <path> from RST to Markdown`
- Body: link to the existing RST file, explain the target is `.md` with the same content, point to a recent landed conversion as a reference, give `./mach doc --no-serve --no-open` as the verification command.
- Component: `Developer Infrastructure / Source Documentation`.

## Reminders

- **One bug per atomic task** unless the user opts into a combined bug.
- **Don't auto-assign** - the template explicitly tells contributors not to ask.
- **Push back on scope** that's too big, too vague, or requires design decisions - those are not good-first-bugs.
- **Match the component to the work** - don't dump everything under Lint and Formatting if the bug isn't a lint bug.
