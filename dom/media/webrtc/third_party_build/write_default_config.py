# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import argparse
import os
import sys
from datetime import datetime
from string import Template

from run_operations import RepoType, detect_repo_type, run_shell

sys.path.insert(0, "./dom/media/webrtc/third_party_build")
import lookup_branch_head

script_name = os.path.basename(__file__)
repo_type = detect_repo_type()

text = """#!/bin/bash

# Edit {path-to} to match the location of your copy of Mozilla's
# fork of libwebrtc (at https://github.com/mozilla/libwebrtc).
export MOZ_LIBWEBRTC_SRC=$$STATE_DIR/moz-libwebrtc

# The previous fast-forward bug number is used for some error messaging.
export MOZ_PRIOR_FASTFORWARD_BUG="$priorbugnum"

# Fast-forwarding each Chromium version of libwebrtc should be done
# under a separate bugzilla bug.  This bug number is used when crafting
# the commit summary as each upstream commit is vendored into the
# mercurial repository.  The bug used for the v106 fast-forward was
# 1800920.
export MOZ_FASTFORWARD_BUG="$bugnum"

# MOZ_NEXT_LIBWEBRTC_MILESTONE and MOZ_NEXT_FIREFOX_REL_TARGET are
# not used during fast-forward processing, but facilitate generating this
# default config.  To generate an default config for the next update, run
# bash dom/media/webrtc/third_party_build/update_default_config_env.sh
export MOZ_NEXT_LIBWEBRTC_MILESTONE=$m2
export MOZ_NEXT_FIREFOX_REL_TARGET=$t2

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
"""


def get_availability_for_milestone(milestone):
    availability_date = lookup_branch_head.get_branch_date(milestone)
    # the try/except here will either return the datetime object if parsing
    # succeeded, or the raw string found during lookup from google.
    try:
        availability_date = datetime.strptime(
            availability_date, "%Y-%m-%dT%H:%M:%S"
        ).date()
    except Exception:
        pass

    return availability_date


# make sure there are 2 chromium releases ahead of the one we're
# attempting to start working
def check_for_version_gap_to_chromium(args):
    next_milestone = args.milestone + 1
    two_milestones_ahead = next_milestone + 2
    if lookup_branch_head.get_branch_head(two_milestones_ahead) is None:
        availability_date = get_availability_for_milestone(two_milestones_ahead)
        availability_message = ""
        if availability_date is not None:
            availability_message = f"It will be available on {availability_date}."
        print(
            "\n"
            "Processing this request ignores the Mozilla tradition of\n"
            "staying two releases behind chromium's useage of libwebrtc.\n"
            f"You're requesting milestone {next_milestone}, but milestone {two_milestones_ahead}\n"
            f"is not yet available. {availability_message}\n"
            "\n"
            "If you know this operation is safe, you can run the following\n"
            "command:\n"
            f"    ./mach python {args.script_path}/{script_name} \\\n"
            f"        --script-path {args.script_path} \\\n"
            f"        --prior-bug-number {args.prior_bug_number} \\\n"
            f"        --bug-number {args.bug_number} \\\n"
            f"        --milestone {args.milestone} \\\n"
            f"        --release-target {args.release_target} \\\n"
            f"        --output-path {args.output_path} \\\n"
            f"        --skip-gap-check\n"
        )
        sys.exit(1)


def get_prior_branch_head(milestone):
    prior_branch_head = lookup_branch_head.get_branch_head(milestone)
    if prior_branch_head is None:
        print(f"error: chromium milestone '{milestone}' is not found.")
        sys.exit(1)
    return prior_branch_head


def get_new_branch_head(next_milestone):
    new_branch_head = lookup_branch_head.get_branch_head(next_milestone)
    if new_branch_head is None:
        availability_date = get_availability_for_milestone(next_milestone)

        print(
            "\n"
            f"Milestone {next_milestone} is not found when attempting to lookup the\n"
            "libwebrtc branch-head used for the Chromium release.\n"
            "This may be because Chromium has not updated the info on page\n"
            "https://chromiumdash.appspot.com/branches"
        )
        if availability_date is not None:
            print(
                "\n"
                "From https://chromiumdash.appspot.com/schedule we see that\n"
                f"milestone {next_milestone} will be availabile on: {availability_date}"
            )
        sys.exit(1)
    return new_branch_head


def build_default_config_env(
    prior_bug_number, bug_number, milestone, target, prior_branch_head, new_branch_head
):
    s = Template(text)
    return s.substitute(
        priorbugnum=prior_bug_number,
        bugnum=bug_number,
        m1=milestone,
        m2=milestone + 1,
        t2=target + 1,
        bh1=prior_branch_head,
        bh2=new_branch_head,
    )


if __name__ == "__main__":
    # first, check which repo we're in, git or hg
    if repo_type is None or not isinstance(repo_type, RepoType):
        print("Unable to detect repo (git or hg)")
        sys.exit(1)

    default_script_dir = "dom/media/webrtc/third_party_build"
    parser = argparse.ArgumentParser(
        description="Updates the default_config_env file for new release/milestone"
    )
    parser.add_argument(
        "--script-path",
        default=default_script_dir,
        help=f"path to script directory (defaults to {default_script_dir})",
    )
    parser.add_argument(
        "--prior-bug-number",
        required=True,
        type=int,
        help="integer Bugzilla number (example: 1800920)",
    )
    parser.add_argument(
        "--bug-number",
        required=True,
        type=int,
        help="integer Bugzilla number (example: 1806510)",
    )
    parser.add_argument(
        "--milestone",
        required=True,
        type=int,
        help="integer chromium milestone (example: 107)",
    )
    parser.add_argument(
        "--release-target",
        required=True,
        type=int,
        help="integer firefox release (example: 111)",
    )
    parser.add_argument(
        "--output-path",
        required=True,
        help="path name of file to write",
    )
    parser.add_argument(
        "--skip-gap-check",
        action="store_true",
        default=False,
        help="continue even when chromium version gap is too small",
    )
    args = parser.parse_args()

    if not args.skip_gap_check:
        check_for_version_gap_to_chromium(args)

    prior_branch_head = get_prior_branch_head(args.milestone)
    new_branch_head = get_new_branch_head(args.milestone + 1)

    with open(args.output_path, "w") as ofile:
        ofile.write(
            build_default_config_env(
                args.prior_bug_number,
                args.bug_number,
                args.milestone,
                args.release_target,
                prior_branch_head,
                new_branch_head,
            )
        )

    run_shell(
        f"{'git commit -m' if repo_type == RepoType.GIT else 'hg commit --message'} "
        f'"Bug {args.bug_number} - '
        f'updated default_config_env for v{args.milestone + 1}"'
        f" {args.output_path}"
    )
