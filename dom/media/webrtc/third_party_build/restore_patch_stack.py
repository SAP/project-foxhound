# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import argparse
import os
import re
import shutil
import sys

from fetch_github_repo import fetch_repo
from run_operations import get_last_line, run_git, run_hg, run_shell

# This script restores the mozilla patch stack and no-op commit tracking
# files.  In the case of repo corruption or a mistake made during
# various rebase conflict resolution operations, the patch-stack can be
# restored rather than requiring the user to restart the fast-forward
# process from the beginning.


def restore_patch_stack(
    github_path,
    github_branch,
    patch_directory,
    state_directory,
    tar_name,
):
    # make sure the repo is clean before beginning
    stdout_lines = run_hg("hg status third_party/libwebrtc")
    if len(stdout_lines) != 0:
        print("There are modified or untracked files under third_party/libwebrtc")
        print("Please cleanup the repo under third_party/libwebrtc before running")
        print(os.path.basename(__file__))
        sys.exit(1)

    # first, refetch the repo (hopefully utilizing the tarfile for speed) so
    # the patches apply cleanly
    print("fetch repo")
    fetch_repo(github_path, True, os.path.join(state_directory, tar_name))

    # remove any stale no-op-cherry-pick-msg files in state_directory
    print("clear no-op-cherry-pick-msg files")
    run_shell(f"rm {state_directory}/*.no-op-cherry-pick-msg || true")

    # lookup latest vendored commit from third_party/libwebrtc/README.mozilla.last-vendor
    print(
        "lookup latest vendored commit from third_party/libwebrtc/README.mozilla.last-vendor"
    )
    file = os.path.abspath("third_party/libwebrtc/README.mozilla.last-vendor")
    last_vendored_commit = get_last_line(file)

    # checkout the previous vendored commit with proper branch name
    print(
        f"checkout the previous vendored commit ({last_vendored_commit}) with proper branch name"
    )
    cmd = f"git checkout -b {github_branch} {last_vendored_commit}"
    run_git(cmd, github_path)

    # restore the patches to moz-libwebrtc repo, use run_shell instead of
    # run_hg to allow filepath wildcard
    print("Restoring patch stack")
    run_shell(f"cd {github_path} && git am {patch_directory}/*.patch")

    # it is also helpful to restore the no-op-cherry-pick-msg files to
    # the state directory so that if we're restoring a patch-stack we
    # also restore the possibly consumed no-op tracking files.
    no_op_files = [
        path
        for path in os.listdir(patch_directory)
        if re.findall(".*no-op-cherry-pick-msg$", path)
    ]
    for file in no_op_files:
        shutil.copy(os.path.join(patch_directory, file), state_directory)

    print("Please run the following command to verify the state of the patch-stack:")
    print("  bash dom/media/webrtc/third_party_build/verify_vendoring.sh")


if __name__ == "__main__":
    default_patch_dir = "third_party/libwebrtc/moz-patch-stack"
    default_state_dir = ".moz-fast-forward"
    default_tar_name = "moz-libwebrtc.tar.gz"

    parser = argparse.ArgumentParser(
        description="Restore moz-libwebrtc github patch stack"
    )
    parser.add_argument(
        "--repo-path",
        required=True,
        help="path to libwebrtc repo",
    )
    parser.add_argument(
        "--branch",
        default="mozpatches",
        help="moz-libwebrtc branch (defaults to mozpatches)",
    )
    parser.add_argument(
        "--patch-path",
        default=default_patch_dir,
        help=f"path to save patches (defaults to {default_patch_dir})",
    )
    parser.add_argument(
        "--tar-name",
        default=default_tar_name,
        help=f"name of tar file (defaults to {default_tar_name})",
    )
    parser.add_argument(
        "--state-path",
        default=default_state_dir,
        help=f"path to state directory (defaults to {default_state_dir})",
    )
    args = parser.parse_args()

    restore_patch_stack(
        args.repo_path,
        args.branch,
        os.path.abspath(args.patch_path),
        args.state_path,
        args.tar_name,
    )
