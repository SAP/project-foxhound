# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import bisect
import json
import os
import subprocess
import sys
from dataclasses import dataclass, field

from mozlint import result
from mozlint.pathutils import expand_exclusions

CLIPPY_FIX_ARGS = ("--fix", "--allow-no-vcs")


def in_sorted_list(l, x):
    i = bisect.bisect_left(l, x)
    return i < len(l) and l[i] == x


def handle_clippy_msg(config, line, log, base_path, files, lint_results):
    try:
        detail = json.loads(line)
        if "message" in detail:
            p = detail["target"]["src_path"]
            detail = detail["message"]
            if "level" in detail:
                if (detail["level"] in {"error", "failure-note"}) and not detail[
                    "code"
                ]:
                    log.debug(
                        "Error outside of clippy."
                        "This means that the build failed. Therefore, skipping this"
                    )
                    log.debug(f"File = {p} / Detail = {detail}")
                    return
                # We are in a clippy warning
                if len(detail["spans"]) == 0:
                    # For some reason, at the end of the summary, we can
                    # get the following line
                    # {'rendered': 'warning: 5 warnings emitted\n\n', 'children':
                    # [], 'code': None, 'level': 'warning', 'message':
                    # '5 warnings emitted', 'spans': []}
                    # if this is the case, skip it
                    log.debug(f"Skipping the summary line {detail} for file {p}")
                    return

                l = detail["spans"][0]
                if files and not in_sorted_list(files, p):
                    return
                p = os.path.join(base_path, l["file_name"])
                line = l["line_start"]
                res = {
                    "path": p,
                    "level": detail["level"],
                    "lineno": line,
                    "column": l["column_start"],
                    "message": detail["message"],
                    "hint": detail["rendered"],
                    "rule": detail["code"]["code"],
                    "lineoffset": l["line_end"] - l["line_start"],
                }
                log.debug(f"Identified an issue in {p}:{line}")
                lint_results["results"].append(result.from_config(config, **res))

    except json.decoder.JSONDecodeError:
        # Could not parse the message.
        # It is usually cargo info like "Finished `release` profile", etc
        return


def check_clippy_ran(completed_proc, crate_name, log):
    """Raise if clippy failed to execute (e.g. build environment not set up)."""
    if completed_proc.returncode == 0:
        return

    def is_valid_json(line):
        try:
            json.loads(line)
            return True
        except json.JSONDecodeError:
            return False

    has_cargo_json = any(
        is_valid_json(line) for line in completed_proc.stdout.splitlines()
    )
    if not has_cargo_json:
        output = completed_proc.stderr.strip() or completed_proc.stdout.strip()
        log.error(
            "clippy failed to execute for crate '%s' (exit code %d):\n%s",
            crate_name,
            completed_proc.returncode,
            output,
        )
        raise RuntimeError(
            f"Failed to run clippy on '{crate_name}' "
            f"(exit code {completed_proc.returncode}). "
            "Ensure the build environment is set up correctly."
        )


def group_paths(paths, config, root):
    """
    Groups input paths based on the crate we need to check

    returns: List of (crate_name, paths) tuples
    """
    gkrust_path_group = PathGroup("gkrust", root)
    non_gkrust_path_groups = []
    non_gkrust_crates = config.get("non_gkrust_crates", {})
    for crate_name, crate_root in non_gkrust_crates.items():
        non_gkrust_path_groups.append(
            PathGroup(crate_name, os.path.join(root, crate_root))
        )

    for path in paths:
        path_group = gkrust_path_group
        for candidate in non_gkrust_path_groups:
            if path.startswith(candidate.crate_root):
                path_group = candidate
                break
        path_group.paths.append(path)
    return [p for p in [gkrust_path_group] + non_gkrust_path_groups if p.paths]


@dataclass
class PathGroup:
    """
    Tracks paths to lint based on the Rust crate we're running clippy on.
    """

    crate_name: str
    crate_root: str
    paths: list[str] = field(default_factory=list)


def lint(paths, config, log, root, substs=None, fix=None, **_lintargs):
    if substs is None:
        substs = {}
    lint_results = {
        "results": [],
        "fixed": 0,
    }

    cargo_bin = substs.get("CARGO", "cargo")

    errors = []
    for path_group in group_paths(paths, config, root):
        try:
            if path_group.crate_name == "gkrust":
                lint_gkrust(path_group, config, log, fix, root, lint_results)
            else:
                lint_crate(path_group, config, log, fix, root, cargo_bin, lint_results)
        except RuntimeError as e:
            errors.append(str(e))

    if errors:
        raise RuntimeError("\n".join(errors))

    return lint_results


def lint_gkrust(path_group, config, log, fix, root, lint_results):
    """
    Lint the gkrust crate.

    This crate contains a lot of dependencies and many of them are legacy code at this point.
    Use a conservative approach to linting:
      * Filter out log messages that don't belong to the specified paths
      * Support the `--fix` flag with path filtering to apply changes only to specified paths.
    """
    paths = list(expand_exclusions(path_group.paths, config, root))
    paths.sort()
    # gkrust depends on things from the mach environment, so we need to run `./mach cargo` instead
    # of `cargo` directly.
    mach_path = root + "/mach"
    # can be extended in build/cargo/cargo-clippy.yaml
    clippy_args = [
        sys.executable,
        mach_path,
        "--log-no-times",
        "cargo",
        "clippy",
    ]
    if fix:
        clippy_args.extend(CLIPPY_FIX_ARGS)
    clippy_args.extend(["--", "--message-format=json"])
    log.debug("Run clippy with = {}".format(" ".join(clippy_args)))
    completed_proc = subprocess.run(
        clippy_args,
        check=False,  # non-zero exit codes are not unexpected
        capture_output=True,
        text=True,
    )
    check_clippy_ran(completed_proc, "gkrust", log)
    for l in completed_proc.stdout.splitlines():
        handle_clippy_msg(config, l, log, root, paths, lint_results)

    if fix and completed_proc.returncode == 0:
        lint_results["fixed"] += 1


def lint_crate(path_group, config, log, fix, root, cargo_bin, lint_results):
    """
    Lint crates other than gkrust.

    These are newer and more self-contained, so we can use a more aggressive approach to linting:
      * Print out all clippy errors for the crate.
      * Support the `--fix` flag to automatically apply fixes.
    """
    clippy_args = [
        cargo_bin,
        "clippy",
        "-p",
        path_group.crate_name,
        "--message-format=json",
    ]
    if fix:
        clippy_args.extend([*CLIPPY_FIX_ARGS, "--allow-dirty"])
    log.debug("Run clippy with = {}".format(" ".join(clippy_args)))
    completed_proc = subprocess.run(
        clippy_args,
        check=False,  # non-zero exit codes are not unexpected
        capture_output=True,
        text=True,
    )
    check_clippy_ran(completed_proc, path_group.crate_name, log)

    for l in completed_proc.stdout.splitlines():
        handle_clippy_msg(config, l, log, root, None, lint_results)

    if fix and completed_proc.returncode == 0:
        lint_results["fixed"] += 1
