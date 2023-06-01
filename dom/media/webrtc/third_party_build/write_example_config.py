# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import argparse
import sys
from string import Template

sys.path.insert(0, "./dom/media/webrtc/third_party_build")
import lookup_branch_head

text = """#!/bin/bash

# Edit {path-to} to match the location of your copy of Mozilla's
# fork of libwebrtc (at https://github.com/mozilla/libwebrtc).
export MOZ_LIBWEBRTC_SRC="{path-to}/moz-libwebrtc"

# Fast-forwarding each Chromium version of libwebrtc should be done
# under a separate bugzilla bug.  This bug number is used when crafting
# the commit summary as each upstream commit is vendored into the
# mercurial repository.  The bug used for the v106 fast-forward was
# 1800920.
export MOZ_FASTFORWARD_BUG="$bugnum"

# MOZ_NEXT_LIBWEBRTC_MILESTONE and MOZ_NEXT_FIREFOX_REL_TARGET are
# not used during fast-forward processing, but facilitate generating this
# example config.  To generate an example config for the next update, run
# bash dom/media/webrtc/third_party_build/update_example_config_env.sh
export MOZ_NEXT_LIBWEBRTC_MILESTONE=$m2
export MOZ_NEXT_FIREFOX_REL_TARGET=$t2

# The branch name for the most recently completed fast-forward version.
# The convention is to include which version of Chromium and the target
# Firefox release in the branch name. We landed the v$m1 fast-forward in
# Firefox $t1.  This branch name is used to prep the github repo for the
# next fast-forward by grabbing all the Mozilla specific commits in the
# prior branch and restacking them at the same base commit ready to
# rebase onto the next upstream commit.
export MOZ_PRIOR_LIBWEBRTC_BRANCH="moz-mods-chr$m1-for-rel$t1"

# For Chromium release branches, see:
# https://chromiumdash.appspot.com/branches

# Chromium's v$m1 release branch was $bh1.  This is used to pre-stack
# the previous release branch's commits onto the appropriate base commit
# (the first common commit between trunk and the release branch).
export MOZ_PRIOR_UPSTREAM_BRANCH_HEAD_NUM="$bh1"

# New target release branch for v$m2 is branch-heads/$bh2.  This is used
# to calculate the next upstream commit.
export MOZ_TARGET_UPSTREAM_BRANCH_HEAD="branch-heads/$bh2"

# For local development 'mozpatches' is fine for a branch name, but when
# pushing the patch stack to github, it should be named something like
# 'moz-mods-chr$m2-for-rel$t2'.
export MOZ_LIBWEBRTC_BRANCH="mozpatches"

# After elm has been merged to mozilla-central, the patch stack in
# moz-libwebrtc should be pushed to github.  The script
# push_official_branch.sh uses this branch name when pushing to the
# public repo.
export MOZ_LIBWEBRTC_OFFICIAL_BRANCH="moz-mods-chr$m2-for-rel$t2"
"""


def build_example_config_env(bug_number, milestone, target):
    prior_branch_head = lookup_branch_head.get_branch_head(milestone)
    if prior_branch_head is None:
        sys.exit("error: chromium milestone '{}' is not found.".format(milestone))
    new_branch_head = lookup_branch_head.get_branch_head(milestone + 1)
    if new_branch_head is None:
        sys.exit(
            "error: next chromium milestone '{}' is not found.".format(milestone + 1)
        )

    s = Template(text)
    return s.substitute(
        bugnum=bug_number,
        m1=milestone,
        t1=target,
        m2=milestone + 1,
        t2=target + 1,
        bh1=prior_branch_head,
        bh2=new_branch_head,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Updates the example_config_env file for new release/milestone"
    )
    parser.add_argument(
        "--bug-number",
        required=True,
        type=int,
        help="integer Bugzilla number (example: 1800920)",
    )
    parser.add_argument(
        "--milestone",
        required=True,
        type=int,
        help="integer chromium milestone (example: 106)",
    )
    parser.add_argument(
        "--release-target",
        required=True,
        type=int,
        help="integer firefox release (example: 110)",
    )
    args = parser.parse_args()

    print(
        build_example_config_env(args.bug_number, args.milestone, args.release_target),
        end="",
    )
