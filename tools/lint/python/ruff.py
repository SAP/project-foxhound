# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import re
import signal
import subprocess
from pathlib import Path

import toml
from mozlint import result

here = os.path.abspath(os.path.dirname(__file__))


def get_pyproject_excludes(pyproject_toml: Path):
    if not pyproject_toml.exists():
        return []

    with pyproject_toml.open() as f:
        data = toml.load(f)

    return data.get("tool", {}).get("ruff", {}).get("exclude", [])


def get_ruff_version(binary):
    """
    Returns found binary's version
    """
    try:
        output = subprocess.check_output(
            [binary, "--version"],
            stderr=subprocess.STDOUT,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        output = e.output

    matches = re.match(r"ruff ([0-9\.]+)", output)
    if matches:
        return matches[1]
    print(f"Error: Could not parse the version '{output}'")


def run_process(cmd, log):
    orig = signal.signal(signal.SIGINT, signal.SIG_IGN)
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    signal.signal(signal.SIGINT, orig)
    try:
        stdout, stderr = proc.communicate()
        proc.wait()
        for line in stderr.splitlines():
            if line:
                log.debug(line)
    except KeyboardInterrupt:
        proc.kill()
        return "", -1

    return stdout, proc.returncode


def lint(paths, config, log, **lintargs):
    fixed = 0
    results = []

    if not paths:
        return {"results": results, "fixed": fixed}

    args = ["ruff", "check", "--force-exclude"] + paths

    if config.get("exclude"):
        args.append(f"--extend-exclude={','.join(config['exclude'])}")

    warning_rules = set(config.get("warning-rules", []))
    if lintargs.get("fix"):
        # Do a first pass with --fix-only as the json format doesn't return the
        # number of fixed issues.
        fix_args = args + ["--fix-only"]
        if not lintargs.get("warning"):
            # Don't fix warnings to limit unrelated changes sneaking into patches.
            # except when  --fix -W  is passed
            fix_args.append(f"--extend-ignore={','.join(warning_rules)}")

        log.debug(f"Running --fix: {fix_args}")
        output, returncode = run_process(fix_args, log)
        if returncode == 2:
            log.error(
                f"ruff terminated abnormally (invalid config, CLI options, or internal error): {output}"
            )
            return {"results": [], "fixed": 0}
        matches = re.match(r"Fixed (\d+) errors?.", output)
        if matches:
            fixed = int(matches[1])
    args += ["--output-format=json"]
    log.debug(f"Running with args: {args}")

    output, returncode = run_process(args, log)
    if returncode == 2:
        log.error(
            f"ruff terminated abnormally (invalid config, CLI options, or internal error): {output}"
        )
        return {"results": [], "fixed": fixed}
    if not output:
        return {"results": [], "fixed": fixed}

    try:
        issues = json.loads(output)
    except json.JSONDecodeError:
        log.error(f"could not parse output: {output}")
        return []

    for issue in issues:
        res = {
            "path": issue["filename"],
            "lineno": issue["location"]["row"],
            "column": issue["location"]["column"],
            "lineoffset": issue["end_location"]["row"] - issue["location"]["row"],
            "message": issue["message"],
            "rule": issue["code"],
            "level": "error",
        }
        if issue["code"] is not None and any(
            issue["code"].startswith(w) for w in warning_rules
        ):
            res["level"] = "warning"

        if issue["fix"]:
            res["hint"] = issue["fix"]["message"]

        results.append(result.from_config(config, **res))

    return {"results": results, "fixed": fixed}


def format(paths, config, log, **lintargs):
    """Run ruff format to check/fix Python formatting."""
    fixed = 0
    results = []

    if not paths:
        return {"results": results, "fixed": fixed}

    args = ["ruff", "format", "--force-exclude"] + paths

    log.debug(f"Ruff version {get_ruff_version('ruff')}")

    topsrcdir = Path(lintargs["root"])
    pyproject_toml = topsrcdir / "pyproject.toml"
    exclude_patterns = get_pyproject_excludes(pyproject_toml)

    # Merge pyproject.toml excludes with config excludes.
    # This is needed because ruff format's --exclude replaces rather than extends
    # the pyproject.toml excludes (unlike ruff check which has --extend-exclude).
    if config.get("exclude"):
        exclude_patterns.extend(config["exclude"])

    for exclude in exclude_patterns:
        args.append(f"--exclude={exclude}")

    if lintargs.get("fix"):
        # Do a first pass to fix, as JSON output doesn't include fix counts
        log.debug(f"Running --fix: {args}")
        output, returncode = run_process(args, log)
        if returncode == 2:
            log.error(
                f"ruff terminated abnormally (invalid config, CLI options, or internal error): {output}"
            )
            return {"results": [], "fixed": 0}
        match = re.search(r"(\d+) files? reformatted", output)
        if match:
            fixed = int(match.group(1))

    args += ["--check", "--output-format=json"]
    log.debug(f"Running with args: {args}")

    output, returncode = run_process(args, log)
    if returncode == 2 and not output:
        log.error(
            "ruff format terminated abnormally (invalid config, CLI options, or internal error)"
        )
        return {"results": [], "fixed": fixed}
    if not output:
        return {"results": [], "fixed": fixed}

    try:
        issues = json.loads(output)
    except json.JSONDecodeError:
        log.error(f"could not parse output: {output}")
        return {"results": [], "fixed": fixed}

    for issue in issues:
        res = {
            "path": issue["filename"],
            "lineno": issue["location"]["row"],
            "column": issue["location"]["column"],
            "message": issue["message"],
            "level": "error",
        }
        results.append(result.from_config(config, **res))

    return {"results": results, "fixed": fixed}
