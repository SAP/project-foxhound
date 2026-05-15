# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import io
import re
import sys
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path

from mozlint import result
from mozlint.pathutils import expand_exclusions

TOPSRCDIR = Path(__file__).parent.parent.parent.parent
sys.path.insert(
    0, str(TOPSRCDIR / "toolkit/components/glean/build_scripts/glean_parser_ext")
)
sys.path.insert(0, str(TOPSRCDIR / "toolkit/components/glean"))

from metrics_index import tags_yamls
from run_glean_parser import ParserError, get_parser_options, parse_with_options

METRIC_NAME_PATTERN = re.compile(r"\.([^:]+):")
COMMON_PREFIX_PATTERN = re.compile(r"COMMON_PREFIX: ([^:]+):")

FENIX_PATTERN = re.compile(r"mobile/android/fenix/")
FOCUS_PATTERN = re.compile(r"mobile/android/focus")


def lint(paths, config, fix=None, **lintargs):
    """Lint Glean metrics.yaml and pings.yaml files using glean_parser's linter."""

    results = []

    groups = {
        "fenix": {
            "metrics": [],
            "pings": [],
            "tags": [TOPSRCDIR / "mobile/android/fenix/app/tags.yaml"],
        },
        "focus": {
            "metrics": [],
            "pings": [],
            "tags": [TOPSRCDIR / "mobile/android/focus-android/app/tags.yaml"],
        },
        "default": {
            "metrics": [],
            "pings": [],
            "tags": [TOPSRCDIR / tag for tag in tags_yamls],
        },
    }

    for p in expand_exclusions(paths, config, lintargs["root"]):
        file_path = Path(p)

        if file_path.name.endswith("metrics.yaml"):
            path_str = file_path.as_posix()
            if FENIX_PATTERN.search(path_str):
                groups["fenix"]["metrics"].append(file_path)
            elif FOCUS_PATTERN.search(path_str):
                groups["focus"]["metrics"].append(file_path)
            else:
                groups["default"]["metrics"].append(file_path)
        elif file_path.name.endswith("pings.yaml"):
            path_str = file_path.as_posix()
            if FENIX_PATTERN.search(path_str):
                groups["fenix"]["pings"].append(file_path)
            elif FOCUS_PATTERN.search(path_str):
                groups["focus"]["pings"].append(file_path)
            else:
                groups["default"]["pings"].append(file_path)

    if not any(group["metrics"] or group["pings"] for group in groups.values()):
        return {"results": results, "fixed": 0}

    # This only impacts "EXPIRED" rules which we're ignoring anyway
    irrelevant_version_number = "500.0"
    options = get_parser_options(irrelevant_version_number, False)

    for group_name, group_data in groups.items():
        metrics_files = group_data["metrics"]
        pings_files = group_data["pings"]
        tags_files = group_data["tags"]

        if not metrics_files and not pings_files:
            continue

        error_stream = io.StringIO()
        group_files = metrics_files + pings_files

        input_files = []
        if metrics_files:
            input_files.extend(metrics_files)
            input_files.extend(tags_files)
        input_files.extend(pings_files)

        with redirect_stdout(io.StringIO()), redirect_stderr(error_stream):
            try:
                parse_with_options(input_files, options, file=error_stream)
            except ParserError:
                for line in error_stream.getvalue().splitlines():
                    stripped_line = line.strip()

                    if stripped_line.startswith(("WARNING:", "ERROR:")):
                        message = stripped_line.removeprefix("WARNING: ").removeprefix(
                            "ERROR: "
                        )

                        # Try to find line number for COMMON_PREFIX errors (category level)
                        common_prefix_match = COMMON_PREFIX_PATTERN.search(message)
                        if common_prefix_match:
                            lineno, file_path = find_yaml_line_in_group(
                                f"{common_prefix_match.group(1)}:", group_files
                            )
                        else:
                            # Try to find line number for metric-specific errors
                            match = METRIC_NAME_PATTERN.search(message)
                            if match:
                                metric_name = (
                                    match.group(1).split(".")[-1]
                                    if "." in match.group(1)
                                    else match.group(1)
                                )
                                lineno, file_path = find_yaml_line_in_group(
                                    f"  {metric_name}:", group_files
                                )
                            else:
                                lineno, file_path = (
                                    None,
                                    (group_files[0] if group_files else None),
                                )

                        if file_path:
                            results.append(
                                result.from_config(
                                    config,
                                    path=str(file_path),
                                    message=message,
                                    level="error",
                                    lineno=lineno,
                                )
                            )

    return {"results": results, "fixed": 0}


def find_yaml_line_in_group(search_pattern, files):
    """Find a pattern in a group of files and return (line_number, file_path)."""
    if not search_pattern:
        return None, None

    for file_path in files:
        for i, line in enumerate(file_path.read_text(encoding="utf-8").splitlines(), 1):
            if search_pattern in line:
                return i, file_path

    return None, None
