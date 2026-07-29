# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import difflib
import os
import re

import yaml
from mozlint import result
from mozlint.pathutils import expand_exclusions

here = os.path.dirname(__file__)
with open(os.path.join(here, "..", "..", "..", "mfbt", "api.yml")) as fd:
    description = yaml.safe_load(fd)


def generate_diff(path, raw_content, line_to_delete):
    prev_content = raw_content.split("\n")
    new_content = [
        raw_line
        for lineno, raw_line in enumerate(prev_content, start=1)
        if lineno != line_to_delete
    ]
    diff = "\n".join(
        difflib.unified_diff(prev_content, new_content, fromfile=path, tofile=path)
    )
    return diff


symbol_pattern = r"\b{}\b"
literal_pattern = r'[0-9."\']{}\b'

categories_pattern = {
    "variables": symbol_pattern,
    "functions": symbol_pattern,
    "macros": symbol_pattern,
    "types": symbol_pattern,
    "literals": literal_pattern,
}


def check_mfbt_headers(path, raw_content, config):
    """Return list of (lineno, msg) for unused mfbt headers."""
    supported_keys = "variables", "functions", "macros", "types", "literals"
    unused = []

    for header, categories in description.items():
        assert set(categories.keys()).issubset(supported_keys)

        if path.endswith(f"mfbt/{header}") or path.endswith(f"mfbt/{header[:-1]}.cpp"):
            continue

        headerline = rf'#\s*include "mozilla/{header}"'
        if not (match := re.search(headerline, raw_content)):
            continue

        content = raw_content.replace(f'"mozilla/{header}"', "")

        for category, pattern in categories_pattern.items():
            identifiers = categories.get(category, [])
            if any(
                re.search(pattern.format(identifier), content)
                for identifier in identifiers
            ):
                break
        else:
            msg = f"{path} includes {header} but does not reference any of its API"
            lineno = 1 + raw_content.count("\n", 0, match.start())
            unused.append((lineno, msg))

    return unused


def lint(paths, config, **lintargs):
    import diskarzhan

    results = {"results": [], "fixed": 0}
    paths = list(expand_exclusions(paths, config, lintargs["root"]))
    fix = lintargs.get("fix")

    for path in paths:
        try:
            with open(path) as fd:
                raw_content = fd.read()
        except UnicodeDecodeError:
            continue

        mfbt_results = check_mfbt_headers(path, raw_content, config)
        diskarzhan_results = diskarzhan.diskarzhan.lint_std_headers(path, raw_content)
        diskarzhan_results += diskarzhan.diskarzhan.lint_cstd_headers(path, raw_content)

        all_results = mfbt_results + diskarzhan_results

        if fix:
            if all_results:
                diskarzhan.diskarzhan.fix_includes(path, raw_content, all_results)
                results["fixed"] += len(all_results)
        else:
            for lineno, msg in all_results:
                results["results"].append(
                    result.from_config(
                        config,
                        path=path,
                        message=msg,
                        level="error",
                        lineno=lineno,
                        diff=generate_diff(path, raw_content, lineno),
                    )
                )

    return results
