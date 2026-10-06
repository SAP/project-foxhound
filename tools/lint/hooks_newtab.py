#!/usr/bin/env python3
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
# Pre-commit hook for newtab developers.
#
# Install:
#   ln -sf "$(git rev-parse --show-toplevel)/tools/lint/hooks_newtab.py" \
#          "$(git rev-parse --show-toplevel)/.git/hooks/pre-commit"
#
# Configure tests (optional, default is none):
#   git config newtab.pre-commit.tests none       # skip tests (default)
#   git config newtab.pre-commit.tests jest       # Jest only (~30s)
#   git config newtab.pre-commit.tests jest-karma # Jest + Karma/Enzyme (~3-5min)
#   git config newtab.pre-commit.tests all        # all tests including xpcshell and browser (10+ min)

# Runs three checks in order, stopping at the first failure:
#   1. Bundle: if newtab source or bundle output files are staged, runs
#      `mach newtab bundle` and blocks if the output differs from what is staged.
#   2. Lint: runs `mach lint --workdir=staged` and blocks on errors.
#   3. Tests: optionally runs unit tests based on `newtab.pre-commit.tests` git config.

import os
import shutil
import signal
import subprocess
import sys
from subprocess import CalledProcessError, check_output

RED = "\033[31m" if sys.stderr.isatty() else ""
RESET = "\033[0m" if sys.stderr.isatty() else ""

here = os.path.dirname(os.path.realpath(__file__))
topsrcdir = os.path.join(here, os.pardir, os.pardir)

NEWTAB_SRC = "browser/extensions/newtab/content-src"
BUNDLE_FILES = [
    "browser/extensions/newtab/data/content/activity-stream.bundle.js",
    "browser/extensions/newtab/css/activity-stream.css",
    "browser/extensions/newtab/prerendered/activity-stream.html",
]


def run_process(cmd):
    proc = subprocess.Popen(cmd)
    orig_handler = signal.signal(signal.SIGINT, signal.SIG_IGN)
    proc.wait()
    signal.signal(signal.SIGINT, orig_handler)
    return proc.returncode


def newtab_files_staged():
    try:
        staged = check_output(
            ["git", "diff", "--staged", "--diff-filter=d", "--name-only", "HEAD"],
            text=True,
            stderr=subprocess.DEVNULL,
        ).split()
        return any(f.startswith(f"{NEWTAB_SRC}/") or f in BUNDLE_FILES for f in staged)
    except CalledProcessError:
        return False


def check_bundle(python):
    print("[newtab hook] Newtab source files staged — verifying bundle...")
    ret = run_process([python, os.path.join(topsrcdir, "mach"), "newtab", "bundle"])
    if ret != 0:
        return ret

    if run_process(["git", "diff", "--quiet", "--"] + BUNDLE_FILES) != 0:
        dirty = check_output(
            ["git", "diff", "--name-only", "--"] + BUNDLE_FILES, text=True
        ).strip()
        print(
            f"\n{RED}[newtab hook] ERROR: Bundle output changed after running './mach newtab bundle'.{RESET}"
        )
        print(
            f"{RED}[newtab hook] Please stage the following files before committing:{RESET}"
        )
        print(dirty)
        return 1

    print("[newtab hook] Bundle is up to date.")
    return 0


def run_lint(python):
    print("[newtab hook] Running lint on staged files...")
    return run_process([
        python,
        os.path.join(topsrcdir, "mach"),
        "lint",
        "--workdir=staged",
    ])


def run_tests(python):
    try:
        test_level = check_output(
            ["git", "config", "newtab.pre-commit.tests"], text=True
        ).strip()
    except CalledProcessError:
        test_level = "none"

    mach = [python, os.path.join(topsrcdir, "mach")]

    if test_level == "none":
        return 0
    elif test_level == "jest":
        print("[newtab hook] Running Jest tests...")
        return run_process(
            mach
            + [
                "npm",
                "test",
                "--prefix=browser/extensions/newtab",
                "--",
                "--testPathPattern=test/jest",
            ]
        )
    elif test_level == "jest-karma":
        print("[newtab hook] Running Jest + Karma tests...")
        return run_process(mach + ["npm", "test", "--prefix=browser/extensions/newtab"])
    elif test_level == "all":
        print("[newtab hook] Running all newtab tests...")
        for cmd in [
            mach + ["npm", "test", "--prefix=browser/extensions/newtab"],
            mach + ["test", "browser/components/newtab/test/xpcshell", "--headless"],
            mach + ["test", "browser/components/newtab/test/browser", "--headless"],
        ]:
            ret = run_process(cmd)
            if ret != 0:
                return ret
        return 0
    else:
        print(
            f"[newtab hook] Warning: Unknown test level '{test_level}'. Skipping tests."
        )
        print("[newtab hook] Valid values: none, jest, jest-karma, all")
        return 0


def git():
    git_dir = check_output(["git", "rev-parse", "--git-dir"], text=True).strip()
    if os.path.exists(os.path.join(git_dir, "rebase-merge")) or os.path.exists(
        os.path.join(git_dir, "rebase-apply")
    ):
        return 0

    python = shutil.which("python3")
    if not python:
        print("error: Python 3 not detected on your system! Please install it.")
        sys.exit(1)

    failed = 0

    if newtab_files_staged():
        if check_bundle(python) != 0:
            return 1

    if run_lint(python) != 0:
        return 1

    if run_tests(python) != 0:
        print(
            "\n[newtab hook] To skip tests and commit anyway, use: git commit --no-verify"
        )
        failed = 1

    return failed


if __name__ == "__main__":
    sys.exit(git())
