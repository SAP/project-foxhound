# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script lists the commits on a libwebrtc branch-head for a given
# chromium milestone.  It resolves the branch-head number from the milestone
# using lookup_branch_head.py and then lists the commits that are specific
# to that release branch (cherry-picked onto branch-heads/XXXX but not on
# master).
#
# The get_branch_head_commits() function is also imported by
# check_missing_branch_head_commits.py.

import argparse
import os
import sys

from fetch_github_repo import fetch_repo
from lookup_branch_head import get_branch_head
from run_operations import run_git

default_state_dir = ".moz-fast-forward"
default_repo_dir = ".moz-fast-forward/moz-libwebrtc"
default_tar_name = "moz-libwebrtc.tar.gz"


def get_branch_head_commits(repo_path, milestone):
    if not os.path.exists(repo_path):
        print(f"repo not found at {repo_path}, fetching...")
        fetch_repo(
            repo_path,
            False,
            os.path.join(default_state_dir, default_tar_name),
        )

    branch_head_num = get_branch_head(milestone)
    if branch_head_num is None:
        sys.exit(
            f"error: no branch_head info is found for chromium milestone '{milestone}'."
        )

    branch_head = f"branch-heads/{branch_head_num}"

    merge_base_lines = run_git(f"git merge-base master {branch_head}", repo_path)
    if len(merge_base_lines) != 1:
        sys.exit(f"error: unable to find merge-base for {branch_head}")
    merge_base = merge_base_lines[0]

    full_shas = run_git(f"git log --format=%H {merge_base}..{branch_head}", repo_path)
    oneline_commits = run_git(
        f"git log --oneline {merge_base}..{branch_head}", repo_path
    )
    upstream_subjects = run_git(
        f"git log --format=%s {merge_base}..{branch_head}", repo_path
    )

    return branch_head, full_shas, oneline_commits, upstream_subjects


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Show commits on the libwebrtc branch-head for a given chromium milestone"
    )
    parser.add_argument(
        "milestone", type=int, help="integer chromium milestone (example: 106)"
    )
    parser.add_argument(
        "--repo-path",
        default=default_repo_dir,
        help=f"path to moz-libwebrtc repo (defaults to {default_repo_dir})",
    )
    args = parser.parse_args()

    branch_head, full_shas, oneline_commits, upstream_subjects = (
        get_branch_head_commits(args.repo_path, args.milestone)
    )

    print(f"chromium milestone {args.milestone} uses {branch_head}")

    if not oneline_commits:
        print(f"no branch-specific commits found on {branch_head}")
        sys.exit(0)

    print(f"\n{len(oneline_commits)} commit(s) on {branch_head}:")
    for commit in oneline_commits:
        print(commit)
