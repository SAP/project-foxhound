# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import argparse
import atexit
import os
import re
import shutil
import sys

from run_operations import (
    ErrorHelp,
    RepoType,
    check_repo_status,
    detect_repo_type,
    git_is_config_set,
    git_status,
    is_mac_os,
    run_git,
    run_hg,
    run_shell,
)

# This script saves the mozilla patch stack and no-op commit tracking
# files.  This makes our fast-forward process much more resilient by
# saving the intermediate state after each upstream commit is processed.

script_name = os.path.basename(__file__)
error_help = ErrorHelp()
error_help.set_prefix(f"*** ERROR *** {script_name} did not complete successfully")

repo_type = detect_repo_type()


@atexit.register
def early_exit_handler():
    error_help.print_help()


def build_repo_name_from_path(input_dir):
    # strip off the (probably moz-patch-stack) patch-stack location
    output_dir = os.path.dirname(os.path.relpath(input_dir))

    # if directory is under third_party (likely), give us the
    # part after third_party
    if os.path.commonpath([output_dir, "third_party"]) != "":
        output_dir = os.path.relpath(output_dir, "third_party")

    return output_dir


def write_patch_files_with_prefix(
    github_path,
    patch_directory,
    start_commit_sha,
    end_commit_sha,
    prefix,
):
    cmd = f"git format-patch --keep-subject --no-signature --output-directory {patch_directory} {start_commit_sha}..{end_commit_sha}"
    run_git(cmd, github_path)

    # remove the commit summary from the file name and add provided prefix
    patches_to_rename = os.listdir(patch_directory)
    for file in patches_to_rename:
        shortened_name = re.sub(r"^(\d\d\d\d)-.*\.patch", f"{prefix}\\1.patch", file)
        os.rename(
            os.path.join(patch_directory, file),
            os.path.join(patch_directory, shortened_name),
        )


def write_prestack_and_standard_patches(
    github_path,
    patch_directory,
    start_commit_sha,
    end_commit_sha,
):
    # grab the log of our patches that live on top of libwebrtc, and find
    # the commit of our base patch.
    cmd = f"git log --oneline {start_commit_sha}..{end_commit_sha}"
    stdout_lines = run_git(cmd, github_path)
    base_commit_summary = "Bug 1376873 - Rollup of local modifications"
    found_lines = [s for s in stdout_lines if base_commit_summary in s]
    if len(found_lines) == 0:
        error_help.set_help(
            "The base commit for Mozilla's patch-stack was not found in the\n"
            "git log.  The commit summary we're looking for is:\n"
            f"{base_commit_summary}"
        )
        sys.exit(1)
    base_commit_sha = found_lines[0].split(" ")[0]
    print(f"Found base_commit_sha: {base_commit_sha}")

    # First, a word about pre-stack and standard patches.  During the
    # libwebrtc update process, there are 2 cases where we insert
    # patches between the upstream trunk commit we're current based on
    # and the Mozilla patch-stack:
    # 1) Release branch commits are frequently used.  These are patches
    #    that are typically cherry-picks of further upstream commits
    #    that are needed to fix bugs in a upstream release.  When
    #    beginning the Mozilla libwebrtc update process, it is necessary
    #    to copy those release branch commits and insert them between
    #    the trunk commit we're based on, and the Mozilla patch-stack we
    #    carry in order for vendoring to produce the same result with
    #    which we ended the previous update.
    # 2) During update process, to avoid fixing/unfixing/refixing rebase
    #    conflicts due to upstream landing/reverting/relanding patches,
    #    our update scripts look ahead in the upstream commits for
    #    reverted and relanded patches.  If found, we insert the
    #    reverted commit before our Mozilla patch-stack.  This has the
    #    effect of creating a virtually empty commit for the patch that
    #    originally lands and then the revert commit.  Using this
    #    technique allows us to fix any potential rebase conflicts when
    #    the commit is eventually relanded the final time.
    #
    # Pre-stack commits (written with a 'p' prefix) are everything that
    # we insert between upstream and the Mozilla patch-stack from the
    # two categories above.
    #
    # Standard commits (written with a 's' prefix) are the Mozilla
    # patch-stack commits.
    #
    # Note: the prefixes are also conveniently alphabetical so that
    # restoring them can be done with a simple 'git am *.patch' command.

    # write only the pre-stack patches out
    write_patch_files_with_prefix(
        github_path, patch_directory, f"{start_commit_sha}", f"{base_commit_sha}^", "p"
    )

    # write only the "standard" stack patches out
    write_patch_files_with_prefix(
        github_path, patch_directory, f"{base_commit_sha}^", f"{end_commit_sha}", "s"
    )


def handle_missing_files(patch_directory):
    # get missing files (that should be marked removed)
    if repo_type == RepoType.GIT:
        stdout_lines = git_status(".", patch_directory)
        stdout_lines = [
            m[0] for m in (re.findall(r"^ D (.*)", line) for line in stdout_lines) if m
        ]
        if len(stdout_lines) != 0:
            cmd = f"git rm {' '.join(stdout_lines)}"
            run_git(cmd, ".")
    else:
        cmd = f"hg status --no-status --deleted {patch_directory}"
        stdout_lines = run_hg(cmd)
        if len(stdout_lines) != 0:
            cmd = f"hg rm {' '.join(stdout_lines)}"
            run_hg(cmd)


def handle_unknown_files(patch_directory):
    # get unknown files (that should be marked added)
    if repo_type == RepoType.GIT:
        stdout_lines = git_status(".", patch_directory)
        stdout_lines = [
            m[0]
            for m in (re.findall(r"^\?\? (.*)", line) for line in stdout_lines)
            if m
        ]
        if len(stdout_lines) != 0:
            cmd = f"git add {' '.join(stdout_lines)}"
            run_git(cmd, ".")
    else:
        cmd = f"hg status --no-status --unknown {patch_directory}"
        stdout_lines = run_hg(cmd)
        if len(stdout_lines) != 0:
            cmd = f"hg add {' '.join(stdout_lines)}"
            run_hg(cmd)


def handle_modified_files(patch_directory):
    if repo_type == RepoType.HG:
        # for the mercurial case, there is no work to be done here
        return

    stdout_lines = git_status(".", patch_directory)
    stdout_lines = [
        m[0] for m in (re.findall(r"^ M (.*)", line) for line in stdout_lines) if m
    ]
    if len(stdout_lines) != 0:
        cmd = f"git add {' '.join(stdout_lines)}"
        run_git(cmd, ".")


def save_patch_stack(
    github_path,
    github_branch,
    patch_directory,
    state_directory,
    target_branch_head,
    bug_number,
    no_pre_stack,
):
    # remove the current patch files
    files_to_remove = os.listdir(patch_directory)
    for file in files_to_remove:
        os.remove(os.path.join(patch_directory, file))

    # find the base of the patch stack
    cmd = f"git merge-base {github_branch} {target_branch_head}"
    stdout_lines = run_git(cmd, github_path)
    merge_base = stdout_lines[0]

    if no_pre_stack:
        write_patch_files_with_prefix(
            github_path, patch_directory, f"{merge_base}", f"{github_branch}", ""
        )
    else:
        write_prestack_and_standard_patches(
            github_path,
            patch_directory,
            f"{merge_base}",
            f"{github_branch}",
        )

    # remove the unhelpful first line of the patch files that only
    # causes diff churn.  For reasons why we can't skip creating backup
    # files during the in-place editing, see:
    # https://stackoverflow.com/questions/5694228/sed-in-place-flag-that-works-both-on-mac-bsd-and-linux
    run_shell(f"sed -i'.bak' -e '1d' {patch_directory}/*.patch")
    run_shell(f"rm {patch_directory}/*.patch.bak")

    # it is also helpful to save the no-op-cherry-pick-msg files from
    # the state directory so that if we're restoring a patch-stack we
    # also restore the possibly consumed no-op tracking files.
    if state_directory != "":
        no_op_files = [
            path
            for path in os.listdir(state_directory)
            if re.findall(".*no-op-cherry-pick-msg$", path)
        ]
        for file in no_op_files:
            shutil.copy(os.path.join(state_directory, file), patch_directory)

    handle_missing_files(patch_directory)
    handle_unknown_files(patch_directory)
    handle_modified_files(patch_directory)

    # if any files are marked for add/remove/modify, commit them
    if repo_type == RepoType.GIT:
        stdout_lines = git_status(".", patch_directory)
        stdout_lines = [
            line for line in stdout_lines if re.findall(r"^(M|A|D)  .*", line)
        ]
    else:
        cmd = f"hg status --added --removed --modified {patch_directory}"
        stdout_lines = run_hg(cmd)
    if (len(stdout_lines)) != 0:
        print(f"Updating {len(stdout_lines)} files in {patch_directory}")
        if bug_number is None:
            if repo_type == RepoType.GIT:
                run_git("git commit --amend --no-edit", ".")
            else:
                run_hg("hg amend")
        else:
            cmd = (
                f"{'git commit -m' if repo_type == RepoType.GIT else 'hg commit --message'} "
                f"'Bug {bug_number} - "
                f"updated {build_repo_name_from_path(patch_directory)} "
                f"patch stack' {patch_directory}"
            )
            stdout_lines = run_shell(cmd)


def verify_git_repo_configuration():
    config_help = [
        "This script fails frequently on macOS (Darwin) without running the",
        "following configuration steps:",
        "    git config set feature.manyFiles true",
        "    git update-index --index-version 4",
        "    git config set core.fsmonitor true",
        "",
        "Note: this configuration should be safe to remain set in the firefox",
        "repository, and may increase everyday performance.  If you would like",
        "to revert the effects after using this script, please use:",
        "    git config unset core.fsmonitor",
        "    git config unset feature.manyFiles",
    ]
    if is_mac_os() and not (
        git_is_config_set("feature.manyfiles", ".")
        and git_is_config_set("core.fsmonitor", ".")
    ):
        error_help.set_help("\n".join(config_help))
        sys.exit(1)


if __name__ == "__main__":
    # first, check which repo we're in, git or hg
    if repo_type is None or not isinstance(repo_type, RepoType):
        error_help.set_help("Unable to detect repo (git or hg)")
        sys.exit(1)

    default_patch_dir = "third_party/libwebrtc/moz-patch-stack"
    default_script_dir = "dom/media/webrtc/third_party_build"
    default_state_dir = ".moz-fast-forward"

    parser = argparse.ArgumentParser(
        description="Save moz-libwebrtc github patch stack"
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
        "--state-path",
        default=default_state_dir,
        help=f"path to state directory (defaults to {default_state_dir})",
    )
    parser.add_argument(
        "--target-branch-head",
        required=True,
        help="target branch head for fast-forward, should match MOZ_TARGET_UPSTREAM_BRANCH_HEAD in config_env",
    )
    parser.add_argument(
        "--script-path",
        default=default_script_dir,
        help=f"path to script directory (defaults to {default_script_dir})",
    )
    parser.add_argument(
        "--separate-commit-bug-number",
        type=int,
        help="integer Bugzilla number (example: 1800920), if provided will write patch stack as separate commit",
    )
    parser.add_argument(
        "--no-pre-stack",
        action="store_true",
        default=False,
        help="don't look for pre-stack/standard patches, simply write the patches all sequentially",
    )
    parser.add_argument(
        "--skip-startup-sanity",
        action="store_true",
        default=False,
        help="skip checking for clean repo and doing the initial verify vendoring",
    )
    args = parser.parse_args()

    if repo_type == RepoType.GIT:
        verify_git_repo_configuration()

    if not args.skip_startup_sanity:
        # make sure the mercurial repo is clean before beginning
        error_help.set_help(
            "There are modified or untracked files in the repo.\n"
            f"Please start with a clean repo before running {script_name}"
        )
        stdout_lines = check_repo_status(repo_type)
        if len(stdout_lines) != 0:
            sys.exit(1)

        # make sure the github repo exists
        error_help.set_help(
            f"No moz-libwebrtc github repo found at {args.repo_path}\n"
            f"Please run restore_patch_stack.py before running {script_name}"
        )
        if not os.path.exists(args.repo_path):
            sys.exit(1)
        error_help.set_help(None)

        print("Verifying vendoring before saving patch-stack...")
        run_shell(f"bash {args.script_path}/verify_vendoring.sh", False)

    save_patch_stack(
        args.repo_path,
        args.branch,
        os.path.abspath(args.patch_path),
        args.state_path,
        args.target_branch_head,
        args.separate_commit_bug_number,
        args.no_pre_stack,
    )

    # unregister the exit handler so the normal exit doesn't falsely
    # report as an error.
    atexit.unregister(early_exit_handler)
