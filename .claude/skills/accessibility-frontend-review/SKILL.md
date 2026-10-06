---
name: accessibility-frontend-review
description: >
  Performs an accessibility code review of a local diff or Phabricator revision in the style of the
  Firefox accessibility team. Use this skill whenever the user asks to review a Phabricator
  patch or revision for accessibility issues, mentions a D-number (like D284142) in the
  context of accessibility review, asks "does this patch have any a11y issues", or wants
  to check a diff against accessibility guidelines. Also use it when the user says things
  like "can you review this for a11y", "check this patch", or "give me an accessibility
  review of D[number]". Invoke proactively when the user pastes a phabricator.services.mozilla.com
  URL or shares a revision ID alongside any accessibility concern. Invoke when questions about the
  following topics are raised: aria properties, aria roles, high contrast mode, forced colors, prefers
  contrast, focus order, screen readers, assistive technology.
---

# Accessibility Review

You are the orchestrator for a two-protocol accessibility review. Your job is to fetch the diff
and associated bug, write a conceptual summary, triage the patch, delegate the actual review work
to focused subagents, and combine their outputs into one Phabricator-ready comment. You do not run
the checklists yourself — subagents do, in isolated context windows.

## Step 1: Identify the input

**Phabricator mode** — the user has provided a revision ID. Accept any of these formats and extract the numeric ID:
- `D291014`
- `291014`
- `https://phabricator.services.mozilla.com/D291014`

**Local mode** — the user wants to review local/uncommitted changes (no revision ID, or they say so explicitly).

If neither applies, ask.

## Step 2: Fetch the diff and associated bug

Do not read any checklists or documentation — subagents handle that. Fetch in parallel:

**Phabricator mode:**
1. Call `mcp__moz__get_phabricator_revision` with the numeric revision ID. Capture the full diff,
   revision title, revision description, and all comments.
2. Extract the bug number from the revision title or description (look for "Bug XXXXXX" patterns).
   If found, call `mcp__moz__get_bugzilla_bug` with that number. If no bug number is present, skip.

**Local mode:**
1. Run `git diff HEAD` and `git log --oneline main..HEAD`. Capture both.
2. Check the commit messages for a "Bug XXXXXX" pattern. If found, call
   `mcp__moz__get_bugzilla_bug` to fetch that bug. If not found, skip.

## Step 3: Write a conceptual summary

Synthesize what you've fetched into a short conceptual summary of the patch. This will be passed
to both subagents so they understand the *intent* behind the code changes, not just the code.

Cover:
- What problem or user need the bug describes
- What the patch does to address it (in plain terms, not line-by-line)
- Which UI components or surfaces are affected
- Any constraints, design decisions, or caveats from the bug comments or revision description
  relevant to understanding why the patch is shaped the way it is

Keep it to 3–6 sentences. If no bug was available, base it on the revision title, description,
and diff. You may also use information from conversation with the user.

## Step 4: Triage

Read the diff to determine two things:
1. Is it C++/Rust/backend only? → No checks apply; say so and stop.
2. Does the patch touch any CSS, HTML, or JS files? → HCM subagent also applies
3. Did the user explicitly request HCM checks? -> HCM subagent also applies

This is the only analysis you perform directly.

## Step 5: Spawn subagents

Spawn the applicable subagents in parallel. Pass the conceptual summary, the full diff text, and
the Phabricator comments (if applicable) into each prompt. Subagents fetch their own resources —
you do not pre-fetch anything for them.

---

### A11y subagent (always spawn for frontend patches)

Use this prompt, inserting the actual content where indicated:

```
You are performing a frontend accessibility review of a Firefox patch.

## Context
[CONCEPTUAL SUMMARY FROM STEP 3 HERE]

## The patch
[FULL DIFF TEXT AND COMMENTS HERE]

## Your task

### Step 1: Fetch the following in parallel
1. Read `references/runsheet.md` — the full a11y checklist (9 categories)
2. Fetch `https://wiki.mozilla.org/Accessibility/Triage` — severity scale

### Step 2: Review the diff and identify components which have been modified.
For each component affected by this patch, characterize it before running any checks:

- Element type: What kind of UI element is this? (button, progress indicator, list item, input, dialog, etc.)
- Visual states: List every distinct visual state the component supports (default, hover, active, disabled, selected, partially-filled, complete, etc.)
- Tradeoff zones: Pre-flag any checks where these constraints make full compliance structurally impossible. These should be assessed for the best available tradeoff rather than failed outright. When a tradeoff is identified, instruct the patch author to follow up with the accessibility team in the #accessibility Slack channel before landing.

### Step 3: Run every check in the self-check guide
Read references/runsheet.md — it contains the full checklist organized into 9 categories. For each category that is relevant to the diff, work through the principles and note any violations.

Be specific. A useful review comment explains exactly what is wrong in the code:

1. Name the file, element type, CSS property, or ARIA attribute
2. Quote or paraphrase the offending line from the diff
3. Explain why it's a problem for users with disabilities
4. Suggest the fix

Avoid vague flags. Do not write things like "focus order might be wrong" or "keyboard support should be checked." Either you see an issue in the diff or you don't. If you're uncertain about a specific pattern, instruct the user to test with the assistive technology in question (ex. "I can't tell if the focus order is correct from this patch alone. Please build your patch and test with keyboard.", "I can't tell what role this component will get. Please build your patch and test with your local screen reader.")

Calibrate severity. Use the severity scale fetched from the fetched triage guidelines at https://wiki.mozilla.org/Accessibility/Triage. Issues that are S2 or above MUST be flagged as ship-blocking.

If no issues are found in any category, say so clearly and briefly. A clean review is a valid and useful outcome.
What NOT to flag
- Issues that are already fixed in the current diff (don't flag problems that only appeared in earlier diffs and have since been addressed)
- Platform/Gecko-layer issues — the checklist is frontend-only

## Output format

Produce your review as a structured comment ready to paste into Phabricator. Use this template:

**Accessibility review**

[One sentence summarizing the overall impression — e.g., "Several accessibility issues detected",
"Follow-up with the accessibility team is necessary", "Looks good overall,
one focus issue to address before landing." OR "No accessibility concerns found." Always flag the
number of S2 issues found - e.g. , "Several accessibility issues detected - 5 S2s",
"No accessibility issues found - 0 S2s"]

---

### Required Testing and Follow-up

**[Category name]** · [ "Testing Required" or "Follow-up Required" ]

[For test items: Specific description of the problem, what the automatic check could not verify, and the exact steps-to-reproduce the user should follow on their own. Include the assistive technology the user should use and what the expected behaviour is, if everything is implemented correctly]

[For follow-up items: Specific description of the problem, including the grey-area or high risk item the automatic check flagged. Include a specific question for the team to copy-paste to the accessibility team in slack or phabricator.]

[If no follow-up or manual testing required, omit this section]

---

### Issues

**[Category name]** · [Severity]

[Specific description of the problem, referencing exact file/element/property.
What is wrong, why it matters for users, what the fix should be.]

[Repeat for each issue found. If no issues, omit this section. Always present issues from most (S1) to least severe (S4)]

---

### Suggestions

[Optional: lower-priority observations that aren't blockers.]

---

*Review performed against the Firefox a11y team checklist.*

```

---

### HCM subagent (spawn only if CSS, HTML, or JS files are present or if explicitly requested)

Use this prompt, inserting the actual content where indicated:

```
You are performing an HCM (High Contrast Mode) and Increase Contrast (IC) review of a Firefox patch.

## Context
[CONCEPTUAL SUMMARY FROM STEP 3 HERE]

## The patch
[FULL DIFF TEXT AND COMMENTS HERE]

## Your task

### Step 1: Fetch the following in parallel
1. Read `accessible/docs/HCMCSSChecklist.md` — the primary HCM checklist
2. Read `accessible/docs/HCMMediaQueries.md` — media query semantics
3. Read `accessible/docs/ColorsAndHighContrastMode.md` — color and HCM guidance
4. Read `toolkit/themes/shared/design-system/dist/tokens-shared.css` — token definitions

### Step 2: Review the diff and identify components which have been modified.
- Which CSS custom properties are introduced, removed, or modified?
- Any new/modified `@media` blocks (`forced-colors`, `prefers-contrast`, `prefers-color-scheme`)?
- Are design system tokens used for colors, or raw values (`rgba()`, hex, `light-dark()`, brand
  palette tokens like `--color-violet-*`)?
- Any existing reviewer comments on HCM issues?

### Step 3: Identify HCM properties and constraints
For each component affected by this patch, characterize it before running any checks:

- **Element type:** What kind of UI element is this? (button, progress indicator, list item, input, dialog, etc.)
- **Visual states:** List every distinct visual state the component supports (default, hover, active, disabled, selected, partially-filled, complete, etc.)
- **HCM-relevant property map:** For each state, identify all properties that may require HCM treatment — not just color. This includes: background, foreground color, border, outline, opacity, box-shadow, filter, backdrop-filter, gradients, SVG fill/stroke, and any visual effect that relies on color blending or transparency.
- **Structural constraints:** Note any case where a single property must coexist with multiple different surfaces across state transitions. A border that must work against both a `ButtonFace` track and a `SelectedItem` fill cannot be in a guaranteed-contrast pair with both simultaneously — this is a structural limit, not a design error.
- **Tradeoff zones:** Pre-flag any checks where these constraints make full compliance structurally impossible. These should be assessed for the best available tradeoff rather than failed outright. When a tradeoff is identified, instruct the patch author to follow up with the accessibility team in the **#accessibility** Slack channel before landing.

### Step 4: Run all checks from `HCMCSSChecklist.md` in order.
For each check:
- Pass: one sentence citing the specific pattern that satisfies it.
- Fail: name the exact variable/selector/line, state the rule violated, give the fix. If a
  reviewer already raised it, quote or paraphrase their comment.

Token chain tracing: when a token appears in a `forced-colors` block, trace it through
`tokens-shared.css` — verify it resolves to a CSS system color via `@layer tokens-forced-colors`.
Do not assume it adapts; check explicitly. Also check JS for `-moz-user-focus` and dynamic class
application, and HTML/Lit templates for structure that affects HCM behaviour.

Format each check as:
  ✅ Check N — [title]: [one sentence why it passes, with code reference]
  ❌ Check N — [title]: [specific issue + fix] *(Already raised by @reviewer: "...")* if applicable

Return your findings in exactly this format:

### HCM Review

**Files in scope:** [comma-separated]

#### Architecture
[Checks 1–3]

#### Token Selection
[Checks 4–10]

#### Elements and Features
[Checks 11–14]

### HCM summary
[N/14 checks passed. Issues in: Check X, Check Y. One sentence on HCM readiness.]
```

---

## Step 6: Combine outputs

Wait for all subagents to complete, then compose the final comment:

```
**Accessibility review**

[One sentence covering both reviews: overall impression, total S2 count from a11y subagent,
HCM pass rate from HCM subagent. E.g. "No concerns found — 0 S2s, 14/14 HCM checks passed."
or "Several issues — 2 S2s, 3 HCM failures requiring attention before landing."]

---

[Paste Issues + Suggestions verbatim from the a11y subagent.]

---

[Paste HCM Review section verbatim from the HCM subagent, if it ran.
If it did not run, render the following text:
"High Contrast Mode checks were not run because the patch didn't appear to contain any
HCM-related changes. If this is incorrect, please re-request review for HCM checks specifically".]

---

*Review performed against the Firefox a11y team checklist.*
```
