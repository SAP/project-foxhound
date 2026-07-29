---
name: reorganize-patches-for-review
description: Analyze a range of local commits, and reorganize them to minimize latency and friction in the review and landing process. To achieve this, commits can be split, reordered, squashed / grouped, or even rewritten. In the final commit series / "patch stack", the codebase should build, lint, and test cleanly after every commit, and each individual commit should stand on its own.
when_to_use: Before a patch (or a patch series) is submitted for first review, if the user agrees to reorganization.
allowed-tools:
  - Bash(jj log:*),
  - Bash(jj show:*),
  - Bash(jj squash:*),
  - Bash(jj commit:*),
  - Bash(jj new:*),
  - Bash(jj describe:*),
  - Bash(jj rebase:*),
  - Bash(jj edit:*),
  - Bash(jj absorb:*),
  - Bash(jj restore:*),
  - Bash(jj file show:*),
  - Read,
  - Grep,
  - Glob
---

# General

## Overview

In the Firefox code base, and in many other Mozilla code bases, commits are reviewed individually. There is no "review squashed series" workflow. Many individual small commits are easier to understand than one large commit. Submitting small commits for review helps catch bugs during review. And in the case that a regression does get introduced, having a fully working product after every commit makes it easy to bisect which change caused the bug or performance regression.

## Goals

- Smoothe out the landing process by avoiding known sources of review and landing friction.
- Reduce cognitive load during review, so that it's easy for the reviewer to spot bugs, and to understand the impact of a change.
- Every "prefix" of the patch series should leave the world in a meaningful valid state.
- Every patch should be an incremental improvement that makes sense to a reviewer in isolation.
- Every patch should look "natural" and not depend on later work to justify its existence.

## Sources of review friction

- Unclear value proposition, if the patch only looks natural once combined with other work in the series
- Mixing of unrelated concerns, e.g. functionality changes and cleanup, or changes made by a tool (e.g. global search and replace + fmt) and other changes
- Messy intermediate states that gets cleaned up in a later commit
- Large number of reviewers on a single patch, if the patch touches files across multiple directories with distinct review responsibilities

## Strategies to minimize friction

- "Land-early nuggets": Often, a larger change will include small tweaks which are orthogonal to the goal of the larger change, but which are non-controversial and which make sense to adopt even if the larger change is rejected. Find those nuggets of value and pull them out into patches that go *before* the larger work - they can be reviewed quickly and will reduce the amount of rebasing that has to happen for the larger change if that one is stuck in review for a while.
- Refactor first, then change behavior: In the process of writing a patch, the main focus is usually on a certain behavior change, and then sometimes some cleanup is done afterwards. But during review, it's usually better to do the "cleanup" / refactor first, in such a way that the actual behavior change that follows will look very natural.
- Predict reviewer response: Do a review of each patch yourself, and predict what a reviewer would say about it. Then shift things around until you think that the reviewer will have nothing to complain about - or at least until they could only disagree with the effect of the patch / the proposed change, and not with the mechanics of the implementation.
- Put behavior changes front-and-center: In patches which change behavior, minimize distractions from unrelated changes.

## Multiple bugs

Sometimes it can make sense to split the series across multiple Bugzilla bugs. Here, the term "bug" is used loosely in the sense of "patch subseries container" / "unit of landing". You can use "Bug TBF-consolidate-rdm-styles - [...]" placeholders in the commit message (TBF = to-be-filed). When done, give the user a list of bugs that need to be filed prior to patch submission, and let them know which placeholders they will need to substitute.

Another approach is to put all patches on the same bug first, and move them out as needed for individual landings. More concretely: As the reviews come in, the developer can move a "fully-reviewed prefix" of the patch series into a different bug and land them there, while the remaining patches stay in the original bug where they wait for the rest of the reviews to come in. The goal is to have one landing per bug. With Phabricator, patches can be moved across bugs without losing the review status.

## Trade-offs

Some of the goals above pull in opposite directions. This section acknowledges that there are some judgment calls involved.

For example, there are often multiple options when making a change to a widely-used API:
- Option 1: In the same commit, change both the API as well as all consumers of that API across all directories. Good: atomic change, passes build, no messy intermediate state. Bad: large patch, large number of reviewers
- Option 2: One commit for the API change, multiple commits (grouped by reviewer) for updating consumers. Good: Small patch, low number of reviewers per patch. Bad: Intermediate state fails to build
- Option 3: One commit makes the API change but keeps a compatibility stub so that existing callers still work, and then multiple patches convert various directories, with a final patch removing the compat stub. Good: Small patch, low number of reviewers per patch, passes build. Bad: somewhat messy intermediate state with compat stub, risk that compat stub stays around indefinitely.

Option 2 should be avoided. Prefer option 1 here in most cases, unless there are so many consumers that updating them all in a single commit is impractical. Option 3 becomes more attractive if the intermediate state still appears somewhat natural.

Going overboard on patch splitting can backfire: Too many individual patches can be a drag to review. Depending on the situation it can be a good idea to group similar changes into the same commit. If a refactoring looks non-sensical without the associated behavior change, it can make sense to do both in the same commit.

## FAQ

### What should be moved to the front of the series?

- Front-load non-controversial improvements.
- Front-load risk: If the entire larger change is doomed if one of its pieces doesn't work out, and if that deal-breaker piece can be validated independently, it can make sense to get just that piece reviewed and landed first. Then it can go through Nightly testing while the specifics of the rest are still being discussed.
- Front-load changes which don't change behavior but which, by being separate, improve the clarity of upcoming behavior change patches.

### What should I do if, in the process of reorganizing patches, I suddenly notice an entirely new and better implementation approach which was non-obvious before? Should I implement the better approach instead?

For this skill, the goal is to have a patch series whose overall diff exactly matches the original overall diff. So resist the temptation to switch approaches; if the temptation is unbearable, ask the user for permission first.

For cosmetic differences, you can have a "residue" patch at the end of the series which makes the diffs match, but which the user is free to abandon.

# Mechanics

This skill has two phases: 1. Envision, and 2. Execute.

## Phase 1: Envision

### Preconditions

Before you start, ensure a clean starting state with no uncommited changes and no conflicts in the original commit series. If the repo is a jj (Jujutsu) repo, run `jj st` and `jj log -r 'main..@'`. Also note the current op-id (`jj op log -n1`) so you can `jj op restore` if anything goes sideways.

Then follow these steps:

1. If the original commit series is small, do a quick review of the original commit series. If it's clear that the patches are already clean, well-ordered, and ready for review, you're done.
2. Remember how to get the overall diff of the original commit series. E.g. `jj diff --git --from oty --to yuxp --at-op aab4`
3. Make a list of the original commits. For each commit:
  - List which files are touched by the commit
  - List which "logical units" the patch consists of. E.g. individual cleanups, orthogonal behavior changes, plumbing, refactors.
4. The hard part: Brainstorm various orderings of the logical units, regardless of what original commit the unit of change was originally part of. Here you create a fresh "origin story" for the final state, and this new origin story should satisfy all the goals above. This process can sometimes some time. One challenge is that you need to keep many different states of the code base in your head at the same time. For example, comments in earlier patches can't refer to concepts that only get introduced in later patches, because that would create a non-sensical intermediate state.
5. Settle on an ideal organization, think of commit messages.

Example:
- Commits A, B, C with logical units `A: [M, N, O], B: [P], C: [Q, R, S]`.
- Settled on ideal organization: `R, M, Q, P, [N, O], S`.

## Phase 2: Execution

Once you know where you want to go, it's just a matter of creating the right commits with the right commit message and the right content. For small commits it can make sense to just rewrite them from scratch. For larger commits you'll want tool assistance.

This section describes what to do if you're in a Jujutsu (jj) repository. If the user is not using jj, good luck and try your best.

You can choose to either mutate the original changes, or you can duplicate changes so that the original changes are still around to quickly compare against. If you mutate the original changes, you can use `--at-op=<operation-id>` with any jj command to simulate a previous state of the repository.

When you're done with everything, make sure the current jj change is an empty change on top of the last commit (`jj new`). In general, prefer `jj new; make changes; jj squash` over `jj edit` so that you can use `jj diff` while you're working to see just the changes you made - if you instead used `jj edit vwx; make changes; jj diff`, it will give you the combined diff of vwx + your local changes, which is often not what you want.

At the end, run `jj fix`. This will run ./mach lint --fix on every commit in parallel and make sure lint passes after every commit.

`jj describe -r <change> -m <commit-message>` sets the commit message for a change.
`jj commit -m <msg>` is a shortcut for `jj describe -m <msg> && jj new`
`jj rebase -r <single-change> -d <new-parent>` moves a single change.
`jj rebase -s <subtree-root> -d <new-parent>` moves a subtree.
`jj rebase -r <single-change> --before <new-child>` or `jj squash --from <change> --insert-before <new-child>` can be used to reorder.
`jj new <conflicted-change>; <address conflicts>; jj squash` can be used to resolve conflicts.
`jj squash --from <one-or-more-changes> --into <dest-change> [FILESET]` can be used to combine changes. Pass `-u` (use destination's description) or `-m "..."` to skip the description editor when both source and destination have descriptions.
`jj squash --from X --insert-before <target> FILESET` extracts FILESET from X into a new commit before `<target>`. This is the swiss army knife for splitting and relocating:
  - `--insert-before X` → FILESET goes into a new parent of X (split, FILESET first).
  - `--insert-before <child-of-X>` → FILESET goes into a new child of X (split, FILESET second).
  - `--insert-before <some-distant-commit>` → FILESET is relocated elsewhere in the stack (the "land-early nugget" case).
  Prefer this over `jj split`, which is a less general subset.
`jj absorb -f <change>` is the fastest way to fold a refactor commit back into its ancestors: each modified line goes to the closest mutable ancestor that last touched it. Anything attributable only to immutable code (e.g. `main`) stays behind in `<change>` as a residue, which can then be squashed manually. Try this first when "fold C4 into C2 and C3"-style work is needed.
`jj restore --from <rev> [paths]` pulls file content from another revision into the working copy without launching an editor.
`jj file show -r <rev> <path>` prints the file's content at `<rev>` to stdout — useful for snapshotting "final state" into a temp file before you rewrite history, so you can later restore or diff against it without checking out the revision.

For guidance on splitting commits, check the `jj-split` skill.

`jj op log` plus `jj op restore <op-id>` lets you undo cleanly after mutating commits; `jj --at-operation <op>` peeks at (or even mutates) prior states without disturbing current work.

### Avoiding interactive tools

Avoid running `jj diffedit`, `jj split` (without paths), and `jj squash -i` - these all open a diff editor and aren't usable from a non-interactive shell.

# Examples

## Example from responsive design mode patches (bug 1978145)

Initial order:

- A: Remove resizer offset and browser border.
- B: Add rudimentary toolbar-on-top support.
- C: Add a browser bottom cover to hide the part that's pushed offscreen when the top toolbar is visible.
- D: Move mouse motion detection to the parent, and add snap animation when the mouse button is lifted.
- E: Improve the visuals of the RDM dynamic toolbar.
- F: Add an .rdm-screen-box element which, unlike the browser, doesn't move, and make it render the shadow. Also bring back the border as another shadow.

After reorganization:

- L: Make RDM element sizes and positions easier to reason about.
  - Combined from parts of A and F, retains the border so that visuals don't change
- M: Simplify RDM resizer positioning in the presence of zoom, by introducing a scaled wrapper element.
  - New patch which only became obvious during reorganization. (Avoid doing this as part of this skill.)
- N: Use a .dynamic-toolbar-enabled class instead of .style.visibility.
  - Extracted from B
- O: Make .rdm-dynamic-toolbar look more like an actual toolbar.
  - Extracted from E
- P: Increase DYNAMIC_TOOLBAR_MAX_HEIGHT to 50px, because a 50px toolbar looks more realistic.
  - Extracted from E
- Q: Make the RDM dynamic toolbar snap to fully-visible or fully-hidden when the mouse is released.
  - Mostly D, maybe with some parts from other patches
- R: Add support for toolbar-on-top to RDM's dynamic toolbar mode.
  - Combined from parts of B, C, and F

Clear responsibility per patch, behavior changes are individual small patches, toolbar-on-top mode (including "browser bottom cover" workaround) isn't a concern until the last patch.
