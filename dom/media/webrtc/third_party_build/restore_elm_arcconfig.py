#!/bin/env python
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import atexit
import os
import sys

from run_operations import (
    ErrorHelp,
    RepoType,
    detect_repo_type,
    run_git,
    run_shell,
)

script_name = os.path.basename(__file__)
error_help = ErrorHelp()
error_help.set_prefix(f"*** ERROR *** {script_name} did not complete successfully")
repo_type = detect_repo_type()


@atexit.register
def early_exit_handler():
    error_help.print_help()


# This script sets the Arcanist configuration for the elm repo. This script
# should be run after each repository reset.
#
# Usage: from the root of the repo `./mach python dom/media/webrtc/third_party_build/restore_elm_arcconfig.py`
#

# first, check which repo we're in, git or hg
if repo_type is None or not isinstance(repo_type, RepoType):
    print("Unable to detect repo (git or hg)")
    sys.exit(1)

commit_msg = "Bug 1729988 - FLOAT - REPO-elm - update .arcconfig repo callsign r=bgrins"
arc_config_file = "dom/media/webrtc/third_party_build/elm_arcconfig.patch"

error_help.set_help("Failed to add FLOATing arcconfig patch for ELM")

if repo_type == RepoType.GIT:
    run_git(f"git apply {arc_config_file}", ".")
    run_git("git add .arcconfig", ".")
    # use run_shell to avoid run_git's call to split on the cmd string
    run_shell(f'git commit -m "{commit_msg}" .arcconfig')
else:
    # use run_shell to avoid run_hg's call to split on the cmd string
    run_shell(f"hg import -m '{commit_msg}' {arc_config_file}")

print("ELM .arcconfig restored. Please push this change to ELM:")
if repo_type == RepoType.GIT:
    # this command may change when we can test this on the official
    # twig repo as hosted on git.
    print("    git push origin master")
else:
    print("    hg push -r tip")

# unregister the exit handler so the normal exit doesn't falsely
# report as an error.
atexit.unregister(early_exit_handler)
