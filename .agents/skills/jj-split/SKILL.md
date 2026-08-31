---
name: jj-split
description: Steps to reliably split a commit/change using the jj (jujutsu) VCS
allowed-tools:
  - Bash(jj log:*),
  - Bash(jj show:*),
  - Bash(jj split:*),
  - Bash(jj commit:*),
  - Bash(jj new:*),
  - Bash(jj describe:*),
  - Bash(jj rebase:*),
  - Bash(jj edit:*),
  - Bash(jj restore:*),
  - Bash(jj file show:*),
  - Read,
  - Grep,
  - Glob
---

# If the commit is to be split based on path

1. Identify the commit to split - Use jj log to find the revision ID of the commit you want to split
2. View the files in the commit - Use jj log -r <revision> --stat to see which files are in the
commit
3. Split the commit - Use jj split -r <revision> -m "description for first commit" <first-file-path>
- The -r flag specifies which revision to split
- The -m flag sets the description for the commit with the selected files
- The file path argument specifies which file(s) go in the first commit
- All remaining files automatically go into a new commit on top
4. Update the second commit's description - Use jj describe -r <new-revision-id> -m "description for
second commit" to set a proper description for the automatically created second commit
5. Verify the split - Use jj log --stat to confirm each commit now contains only its respective file

Key points:
- jj split with a fileset argument is non-interactive and deterministic (reliable)
- The original commit keeps its position in history with the selected files
- The remaining files go into a new commit automatically placed on top
- Descendant commits are automatically rebased

# If the commit is to be split based on hunks (split changes in the same file)

1. Export the full diff
jj show -r <changeid> --git > /tmp/full.patch
2. Manually split the patch into separate files
- Open full.patch in an editor
- Create hunk-1.patch containing only the required hunks
- Create hunk-2.patch containing only the remaining hunks
- Etc.
- IMPORTANT: Store patches outside the repo (e.g., /tmp/) so they don't disappear when switching revisions
3. Go back to parent
jj edit <parent-revision-id>
4. Apply each patch and make
jj new -m "description of hunk 1"
patch -p1 < /tmp/hunk-1.patch

jj new -m "description of hunk 2"
patch -p1 < git apply /tmp/hunk-2.patch

repeat as needed

5. Abandon the original commit
jj abandon <original-revision-id>

Advantages:
- ✅ Preserves exact line numbers and context
- ✅ Good for complex hunks with specific formatting
- ✅ Can be partially automated with tools like splitpatch or filterdiff
- ✅ Patch files serve as documentation of what was split

---
Key Principles for RELIABLE Splitting:

1. Avoid interactive tools - They're not scriptable or reproducible
2. Store artifacts outside the repo - Patch files should be in /tmp/ or similar
3. Verify each step - Use jj diff/jj show to confirm each commit contains only what you expect
4. Clean up - Abandon the original multi-hunk commit when done
