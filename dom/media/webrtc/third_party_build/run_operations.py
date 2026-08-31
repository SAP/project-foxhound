# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
import os
import platform
import subprocess
import sys
from enum import Enum, auto

# This is a collection of helper functions that use the subprocess.run
# command to execute commands.  In the future, if we have cases where
# we find common python functionality in utilizing the data returned
# from these functions, that functionality can live here for easy reuse
# between other python scripts in dom/media/webrtc/third_party_build.


# must run 'hg' with HGPLAIN=1 to ensure aliases don't interfere with
# command output.
env = os.environ.copy()
env["HGPLAIN"] = "1"


def run_hg(cmd):
    cmd_list = cmd.split(" ")
    res = subprocess.run(
        cmd_list,
        capture_output=True,
        text=True,
        env=env,
        check=False,
    )
    if res.returncode != 0:
        print(
            f"Hit return code {res.returncode} running '{cmd}'. Aborting.",
            file=sys.stderr,
        )
        print(res.stderr)
        sys.exit(1)
    stdout = res.stdout.strip()
    return [] if len(stdout) == 0 else stdout.split("\n")


def run_git(cmd, working_dir):
    cmd_list = cmd.split(" ")
    res = subprocess.run(
        cmd_list,
        capture_output=True,
        text=True,
        cwd=working_dir,
        check=False,
    )
    if res.returncode != 0:
        print(
            f"Hit return code {res.returncode} running '{cmd}'. Aborting.",
            file=sys.stderr,
        )
        print(res.stderr)
        sys.exit(1)
    stdout = res.stdout.strip()
    return [] if len(stdout) == 0 else stdout.split("\n")


def run_shell(cmd, capture_output=True):
    res = subprocess.run(
        cmd,
        shell=True,
        capture_output=capture_output,
        text=True,
        check=False,
    )
    if res.returncode != 0:
        print(
            f"Hit return code {res.returncode} running '{cmd}'. Aborting.",
            file=sys.stderr,
        )
        if capture_output:
            print(res.stderr)
        sys.exit(1)
    output_lines = []
    if capture_output:
        stdout = res.stdout.strip()
        output_lines = [] if len(stdout) == 0 else stdout.split("\n")

    return output_lines


def get_last_line(file_path):
    # technique from https://stackoverflow.com/questions/46258499/how-to-read-the-last-line-of-a-file-in-python
    with open(file_path, "rb") as f:
        try:  # catch OSError in case of a one line file
            f.seek(-2, os.SEEK_END)
            while f.read(1) != b"\n":
                f.seek(-2, os.SEEK_CUR)
        except OSError:
            f.seek(0)
        return f.readline().decode().strip()


def update_resume_state(state, resume_state_filename):
    with open(resume_state_filename, "w") as ofile:
        ofile.write(state)
        ofile.write("\n")


class ErrorHelp:
    def __init__(self):
        self.prefix = None
        self.error_help = None
        self.postfix = None

    def set_prefix(self, prefix):
        self.prefix = prefix

    def set_postfix(self, postfix):
        self.postfix = postfix

    def set_help(self, error_help):
        self.error_help = error_help

    def print_help(self):
        if self.prefix is not None:
            print(self.prefix)
        if self.error_help is not None:
            print(self.error_help)
        if self.postfix is not None:
            print(self.postfix)


class RepoType(Enum):
    HG = auto()
    GIT = auto()


def detect_repo_type():
    if os.path.exists(".git"):
        return RepoType.GIT
    elif os.path.exists(".hg"):
        return RepoType.HG
    return None


def git_status(working_dir, search_path="."):
    # We don't use run_git above because it strips all leading
    # whitespace, which causes issues with the output of
    # git status --porcelain since leading spaces matter in the output.
    # For example, the following two lines mean different things:
    #  M file1.txt
    # M  file2.txt
    # file2.txt is staged, while file1.txt is modified, but unstaged.
    cmd = f"git --no-optional-locks status --porcelain {search_path}"
    cmd_list = cmd.split(" ")
    res = subprocess.run(
        cmd_list,
        capture_output=True,
        text=True,
        cwd=working_dir,
        check=False,
    )
    if res.returncode != 0:
        print(
            f"Hit return code {res.returncode} running '{cmd}'. Aborting.",
            file=sys.stderr,
        )
        print(res.stderr)
        sys.exit(1)
    stdout = res.stdout.strip("\n")
    return [] if len(stdout) == 0 else stdout.split("\n")


def check_repo_status(repo_type):
    if not isinstance(repo_type, RepoType):
        print("check_repo_status requires type RepoType")
        raise TypeError
    if repo_type == RepoType.GIT:
        return git_status(".", "third_party/libwebrtc")
    else:
        return run_hg("hg status third_party/libwebrtc")


def is_mac_os():
    return platform.system() == "Darwin"


def git_get_config(config_name, working_dir):
    # using run_shell rather than run_git because a config name that is
    # unset returns a non-zero error code.
    stdout_lines = run_shell(f"cd {working_dir} ; git config {config_name} || true")
    line_cnt = len(stdout_lines)
    if line_cnt > 1:
        print(f"Error: {config_name} returned multiple values ({line_cnt})")
        sys.exit(1)
    elif line_cnt == 1:
        return stdout_lines[0]
    return None


def git_is_config_set(config_name, working_dir):
    config_val = git_get_config(config_name, working_dir)
    if config_val is not None and config_val == "true":
        return True
    return False
