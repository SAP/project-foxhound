# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import argparse
import atexit
import os
import subprocess
import sys

from run_operations import (
    ErrorHelp,
    RepoType,
    detect_repo_type,
    get_last_line,
    git_status,
    run_git,
    run_hg,
    run_shell,
    update_resume_state,
)
from vendor_and_commit import vendor_and_commit

script_name = os.path.basename(__file__)
error_help = ErrorHelp()
error_help.set_prefix(f"*** ERROR *** {script_name} did not complete successfully")

repo_type = detect_repo_type()


def early_exit_handler():
    error_help.print_help()


def run_git_log_output(cmd, working_dir, log_filename):
    res = subprocess.run(
        cmd.split(" "),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        cwd=working_dir,
        check=False,
    )
    with open(log_filename, "w") as ofile:
        ofile.write(res.stdout)
    return res


def run_shell_no_strip(cmd):
    res = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        check=False,
    )
    if res.returncode != 0:
        print(
            f"Hit return code {res.returncode} running '{cmd}'. Aborting.",
            file=sys.stderr,
        )
        print(res.stderr)
        sys.exit(1)
    output_lines = [] if len(res.stdout) == 0 else res.stdout.split("\n")

    return output_lines


def find_base_commit(
    libwebrtc_repo_path,
    target_branch_head,
):
    # read the last line of README.mozilla.last-vendor to retrieve our current base
    # commit in moz-libwebrtc
    base_commit_sha = get_last_line("third_party/libwebrtc/README.mozilla.last-vendor")
    print(f"prelim base_commit_sha: {base_commit_sha}")
    # if we've advanced into a chrome release branch, we need to adjust the
    # base_commit_sha to the last common commit so we can now advance up
    # the trunk commits.
    stdout_lines = run_git(
        f"git merge-base {base_commit_sha} {target_branch_head}", libwebrtc_repo_path
    )
    if len(stdout_lines) != 1:
        error_help.set_help("Unable to find merge-base in find_base_commit")
        sys.exit(1)
    base_commit_sha = stdout_lines[0]
    # now make it a short hash
    stdout_lines = run_git(
        f"git rev-parse --short {base_commit_sha}", libwebrtc_repo_path
    )
    if len(stdout_lines) != 1:
        error_help.set_help("Unable to find merge-base in find_base_commit")
        sys.exit(1)
    base_commit_sha = stdout_lines[0]
    print(f"adjusted base_commit_sha: {base_commit_sha}")
    return base_commit_sha


def find_next_commit(
    libwebrtc_repo_path,
    target_branch_head,
):
    base_commit_sha = find_base_commit(libwebrtc_repo_path, target_branch_head)
    stdout_lines = run_git(
        f"git log --oneline --reverse --format=%h --ancestry-path {base_commit_sha}^..{target_branch_head}",
        libwebrtc_repo_path,
    )
    line_cnt = len(stdout_lines)
    if line_cnt == 0:
        error_help.set_help(
            "No information was returned from 'git log' in find_next_commit"
        )
        sys.exit(1)
    return stdout_lines[1] if len(stdout_lines) > 1 else stdout_lines[0]


def rebase_mozlibwebrtc_stack(
    libwebrtc_repo_path,
    log_path,
    libwebrtc_branch,
    next_libwebrtc_sha,
):
    print("-------")
    print(f"------- Rebase {libwebrtc_branch} to {next_libwebrtc_sha}")
    print("-------")
    run_git(f"git checkout -q {libwebrtc_branch}", libwebrtc_repo_path)
    error_help.set_help(
        f"The rebase operation onto {next_libwebrtc_sha} has failed.  Please\n"
        "resolve all the rebase conflicts.  To fix this issue, you will need to\n"
        f"jump to the github repo at {libwebrtc_repo_path} .\n"
        "When the github rebase is complete, re-run the script to resume the\n"
        "fast-forward process."
    )
    git_log_filename = os.path.join(log_path, "log-rebase-moz-libwebrtc.txt")
    res = run_git_log_output(
        f"git rebase {next_libwebrtc_sha}", libwebrtc_repo_path, git_log_filename
    )
    if res.returncode != 0:
        sys.exit(1)
    error_help.set_help(None)


def git_get_long_sha(
    libwebrtc_repo_path,
    commit_sha,
):
    stdout_lines = run_git(
        f"git show --format=%H --no-patch {commit_sha}", libwebrtc_repo_path
    )
    if len(stdout_lines) == 0:
        error_help.set_help(
            "No information was returned from 'git show' in git_get_long_sha"
        )
        sys.exit(1)
    return stdout_lines[0]


def write_commit_message_file(
    libwebrtc_repo_path,
    state_path,
    tmp_path,
    next_libwebrtc_sha,
    bug_number,
    commit_msg_filename,
):
    print("-------")
    print(f"------- Write commit message file ({commit_msg_filename})")
    print("-------")
    no_op_msg_filename = os.path.join(
        state_path, f"{next_libwebrtc_sha}.no-op-cherry-pick-msg"
    )
    long_sha = git_get_long_sha(libwebrtc_repo_path, next_libwebrtc_sha)

    no_op_msg_contents = None
    if os.path.exists(no_op_msg_filename):
        no_op_msg_contents = "\n".join(run_shell(f"cat {no_op_msg_filename}"))

    original_upstream_commit_msg = "\n".join(
        run_shell_no_strip(
            f'cd {libwebrtc_repo_path} && git show --name-only {next_libwebrtc_sha} | grep "^ "'
        )
    )

    with open(commit_msg_filename, "w") as ofile:
        ofile.write(f"Bug {bug_number} - Vendor libwebrtc from {next_libwebrtc_sha}\n")
        ofile.write("\n")
        if no_op_msg_contents:
            ofile.write(no_op_msg_contents)
            ofile.write("\n")
            ofile.write("\n")
        ofile.write(
            f"Upstream commit: https://webrtc.googlesource.com/src/+/{long_sha}\n"
        )
        ofile.write(original_upstream_commit_msg)


if __name__ == "__main__":
    # first, check which repo we're in, git or hg
    if repo_type is None or not isinstance(repo_type, RepoType):
        print("Unable to detect repo (git or hg)")
        sys.exit(1)

    default_target_dir = "third_party/libwebrtc"
    default_state_dir = ".moz-fast-forward"
    default_log_dir = ".moz-fast-forward/logs"
    default_tmp_dir = ".moz-fast-forward/tmp"
    default_script_dir = "dom/media/webrtc/third_party_build"
    default_repo_dir = ".moz-fast-forward/moz-libwebrtc"
    default_tar_name = "moz-libwebrtc.tar.gz"

    parser = argparse.ArgumentParser(
        description="Move forward one upstream commit and vendor the results"
    )
    parser.add_argument(
        "--target-path",
        required=True,
        help=f"target path for vendoring (typically {default_target_dir})",
    )
    parser.add_argument(
        "--state-path",
        required=True,
        help=f"path to state directory (typically {default_state_dir})",
    )
    parser.add_argument(
        "--log-path",
        required=True,
        help=f"path to log directory (typically {default_log_dir})",
    )
    parser.add_argument(
        "--tmp-path",
        required=True,
        help=f"path to tmp directory (typically {default_tmp_dir})",
    )
    parser.add_argument(
        "--script-path",
        required=True,
        help=f"path to script directory (typically {default_script_dir})",
    )
    parser.add_argument(
        "--repo-path",
        required=True,
        help=f"path to moz-libwebrtc repo (typically {default_repo_dir})",
    )
    parser.add_argument(
        "--branch",
        required=True,
        help="moz-libwebrtc branch (typically mozpatches)",
    )
    parser.add_argument(
        "--commit-bug-number",
        type=int,
        required=True,
        help="integer Bugzilla number (example: 1800920)",
    )
    parser.add_argument(
        "--target-branch-head",
        required=True,
        help="target branch head for fast-forward, should match MOZ_TARGET_UPSTREAM_BRANCH_HEAD in config_env",
    )
    args = parser.parse_args()

    # ensure the log and tmp directories exist
    os.makedirs(args.log_path, exist_ok=True)
    os.makedirs(args.tmp_path, exist_ok=True)

    # check the resume file
    resume_state_filename = os.path.join(args.state_path, "fast_forward.resume")
    resume_state = ""
    if os.path.exists(resume_state_filename):
        resume_state = get_last_line(resume_state_filename).strip()
    print(f"resume_state: '{resume_state}'")

    skip_to = "run"
    if len(resume_state) == 0:
        # Check for modified files and abort if present.
        if repo_type == RepoType.GIT:
            stdout_lines = git_status(".", args.target_path)
        else:
            stdout_lines = run_shell(
                f'hg status --exclude "{args.target_path}/**.orig" {args.target_path}'
            )
        if len(stdout_lines) != 0:
            print("There are modified files in the checkout. Cowardly aborting!")
            print("\n".join(stdout_lines))
            sys.exit(1)

        # Completely clean the checkout before proceeding
        if repo_type == RepoType.GIT:
            run_shell("git restore --staged :/ && git restore :/ && git clean -fd")
        else:
            run_shell("hg update -C -r . && hg purge")
    else:
        skip_to = resume_state
        if repo_type == RepoType.GIT:
            run_git(f"git restore {args.target_path}/README.mozilla.last-vendor", ".")
        else:
            run_hg(f"hg revert -C {args.target_path}/README.mozilla.last-vendor")

    # register the exit handler after the arg parser completes so '--help' doesn't exit with
    # an error.
    atexit.register(early_exit_handler)

    next_commit_sha = find_next_commit(args.repo_path, args.target_branch_head)
    print(f"next_commit_sha: {next_commit_sha}")
    print(f"   resume_state: {resume_state}")
    print(f"        skip_to: {skip_to}")

    commit_msg_filename = os.path.join(args.tmp_path, "commit_msg.txt")

    if skip_to == "run":
        update_resume_state("resume2", resume_state_filename)
        rebase_mozlibwebrtc_stack(
            args.repo_path,
            args.log_path,
            args.branch,
            next_commit_sha,
        )

    if skip_to == "resume2":
        skip_to = "run"
    if skip_to == "run":
        update_resume_state("resume3", resume_state_filename)
        write_commit_message_file(
            args.repo_path,
            args.state_path,
            args.tmp_path,
            next_commit_sha,
            args.commit_bug_number,
            commit_msg_filename,
        )

    if skip_to == "resume3":
        skip_to = "run"
    if skip_to == "run":
        vendor_and_commit(
            args.script_path,
            args.repo_path,
            args.branch,
            next_commit_sha,
            args.target_path,
            args.state_path,
            args.log_path,
            commit_msg_filename,
        )

    update_resume_state("", resume_state_filename)

    no_op_msg_filename = os.path.join(
        args.state_path, f"{next_commit_sha}.no-op-cherry-pick-msg"
    )
    if os.path.exists(no_op_msg_filename):
        os.remove(no_op_msg_filename)

    # unregister the exit handler so the normal exit doesn't falsely
    # report as an error.
    atexit.unregister(early_exit_handler)
