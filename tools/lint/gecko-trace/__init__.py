# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import fnmatch
import io
import sys
from difflib import unified_diff
from pathlib import Path

import mozlint
from buildconfig import topsrcdir

COMPONENT_DIR = Path(topsrcdir) / "toolkit/components/gecko-trace"


def lint(paths, config, fix=False, **lint_args):
    sys.path.insert(0, str(COMPONENT_DIR / "scripts"))
    from codegen import load_schema_index  # type: ignore

    schema_index = load_schema_index()

    results = _check_unregistered_files(paths, config, schema_index)
    metrics_results = _check_generated_metrics(config, fix)

    sys.path.pop(0)

    return {
        "results": results + metrics_results["results"],
        "fixed": metrics_results["fixed"],
    }


def _check_unregistered_files(paths, config, schema_index):
    """
    Check for gecko-trace YAML files that are not registered in the schema index.
    """
    results = []
    for path in fnmatch.filter(paths, "*gecko-trace.y*ml"):
        if path not in schema_index:
            results.append(
                mozlint.result.from_config(
                    config,
                    level="error",
                    path=path,
                    message="File is not registered in the gecko-trace schema index.",
                    hint=f"Please add this file to `gecko_trace_files` in `{COMPONENT_DIR}/index.py`.",
                )
            )
    return results


def _check_generated_metrics(config, fix):
    """
    Check if the generated-metrics.yaml file is out of date.
    """
    from codegen import generate_glean_metrics  # type: ignore
    from schema_parser import SchemaError  # type: ignore

    generated_metrics_path = COMPONENT_DIR / "generated-metrics.yaml"

    with open(generated_metrics_path, "r+" if fix else "r") as metrics_file:
        new_metrics_buffer = io.StringIO()
        try:
            generate_glean_metrics(new_metrics_buffer)
        except SchemaError as e:
            return {
                "results": [
                    mozlint.result.from_config(
                        config,
                        level="error",
                        message=str(e),
                    )
                ],
                "fixed": 0,
            }

        old_metrics = metrics_file.read().splitlines()
        new_metrics = new_metrics_buffer.getvalue().splitlines()

        diff = list(
            unified_diff(
                old_metrics,
                new_metrics,
                fromfile=f"in-tree {generated_metrics_path.name}",
                tofile=f"new {generated_metrics_path.name}",
                lineterm="",
            )
        )

        if diff:
            if fix:
                metrics_file.seek(0)
                metrics_file.write("\n".join(new_metrics))
                metrics_file.truncate()

            return {
                "results": [
                    mozlint.result.from_config(
                        config,
                        level="error",
                        path=str(generated_metrics_path),
                        message=f"`{generated_metrics_path.name}` is out of date. Please regenerate it.",
                        hint=f"Run `mach gecko-trace {generated_metrics_path.name}` to regenerate.",
                        diff="\n".join(diff),
                    )
                ],
                "fixed": int(fix),
            }

    return {"results": [], "fixed": 0}
