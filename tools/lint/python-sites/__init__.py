# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re
from pathlib import Path

from mozlint import result
from mozlint.pathutils import expand_exclusions

repo_root = Path(__file__).parents[3]
mach_site_file = repo_root / "python" / "sites" / "mach.txt"
taskgraph_requirements_file = repo_root / "taskcluster" / "requirements.in"
skip_prefixes = ("#", "requires-python:")

TASKGRAPH_VERSION_RE = re.compile(r"taskcluster-taskgraph(?:\[.*?\])?==(\S+?)(?::|$)")


def lint(paths, config, fix=None, **lintargs):
    results = []
    fixed = 0
    files = sorted(Path(p) for p in expand_exclusions(paths, config, lintargs["root"]))
    log = lintargs["log"]

    mach_dependencies = set()
    for raw_line in mach_site_file.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith(skip_prefixes):
            continue
        mach_dependencies.add(line)

    for path in files:
        try:
            if path.name != "mach.txt":
                redundant_spec_results, redundant_spec_fixed = (
                    command_site_redundant_specifications(
                        path, mach_dependencies, fix, config
                    )
                )
                results += redundant_spec_results
                fixed += redundant_spec_fixed

            results += check_taskgraph_version_sync(path, config)

            order_results, order_fixed = site_ordering(path, fix, config)
            results += order_results
            fixed += order_fixed

        except Exception as ex:
            log.debug(f"Error: {ex}, in file: {path}")

    return {"results": results, "fixed": fixed}


def command_site_redundant_specifications(
    path: Path, mach_dependencies: set, fix: bool, config
):
    lines = path.read_text().splitlines(keepends=True)
    new_lines = []
    fixed = 0
    results = []

    for line_number, raw_line in enumerate(lines):
        stripped = raw_line.strip()
        if not stripped or stripped.startswith(skip_prefixes):
            new_lines.append(raw_line)
            continue

        if stripped in mach_dependencies:
            if fix:
                fixed += 1
                continue

            output = {
                "path": str(path),
                "message": f"Specification of '{stripped}' is redundant; already in {mach_site_file}.",
                "level": "error",
                "lineno": line_number + 1,
            }
            results.append(result.from_config(config, **output))
        else:
            new_lines.append(raw_line)

    if fixed:
        path.write_text("".join(new_lines), newline="\n")

    return results, fixed


def site_ordering(path: Path, fix: bool, config):
    lines = path.read_text().splitlines(keepends=True)
    first_line = lines[0]
    results = []
    fixed = 0
    start_index = 1

    if not first_line.strip().startswith("requires-python:"):
        start_index = 0
        results.append(
            result.from_config(
                config,
                path=str(path),
                message="First line must start with 'requires-python:'.",
                level="error",
                lineno=1,
            )
        )

    blocks = []
    comment_block = []
    for raw_line in lines[start_index:]:
        stripped = raw_line.strip()
        if not stripped:
            continue

        # Group any comment lines with the following specification line before sorting.
        if stripped.startswith("#"):
            comment_block.append(raw_line)
        else:
            blocks.append((comment_block.copy(), raw_line))
            comment_block.clear()

    sorted_blocks = sorted(blocks, key=lambda pair: pair[1].strip())
    if blocks != sorted_blocks:
        if fix:
            new_lines = [first_line]
            for comments, spec in sorted_blocks:
                new_lines.extend(comments)
                new_lines.append(spec if spec.endswith("\n") else spec + "\n")
            path.write_text("".join(new_lines), newline="\n")
            fixed = 1
        else:
            results.append(
                result.from_config(
                    config,
                    path=str(path),
                    message="After 'requires-python:', entries must be in alphabetical order.",
                    hint="Re-run with --fix to resolve this automatically.",
                    level="error",
                    lineno=start_index + 1,
                )
            )

    return results, fixed


def check_taskgraph_version_sync(site_path: Path, config):
    results = []

    site_version = site_lineno = None
    for lineno, line in enumerate(site_path.read_text().splitlines(), start=1):
        m = TASKGRAPH_VERSION_RE.search(line)
        if m:
            site_version, site_lineno = m.group(1), lineno
            break

    if not site_version:
        return results

    for line in taskgraph_requirements_file.read_text().splitlines():
        m = TASKGRAPH_VERSION_RE.search(line)
        if m and m.group(1) != site_version:
            results.append(
                result.from_config(
                    config,
                    path=str(site_path),
                    message=(
                        f"taskcluster-taskgraph version mismatch: "
                        f"{site_path.name} has '{site_version}' but "
                        f"taskcluster/requirements.in has '{m.group(1)}'."
                    ),
                    level="error",
                    lineno=site_lineno,
                )
            )
            break

    return results
