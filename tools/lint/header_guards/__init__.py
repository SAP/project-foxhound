# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import difflib
import os
import re

from mozlint import result
from mozlint.pathutils import expand_exclusions

comment_remover = re.compile(r"((?://[^\r\n]*)|(?:/\*.*?\*/)|\s)", re.DOTALL)
header_guard = re.compile(
    r"^\s*#\s*(?:(?:ifndef\s(\w+))|(?:if\s+\!\s*defined\(\s*(\w+)\s*\))|(?:pragma\s+once)).*"
)


def check_missing_header_guards(results, topsrcdir, path, raw_content, config, fix):
    offset = 0
    comment_prelude = re.match(comment_remover, raw_content)
    while comment_prelude:
        offset += len(comment_prelude.group(1))
        comment_prelude = re.match(comment_remover, raw_content[offset:])
    stripped_content = raw_content[offset:]
    lineno = raw_content.count("\n", 0, offset)
    if m := re.match(header_guard, stripped_content):
        groups = m.groups()
        if any(groups):
            existing_guard = groups[0] or groups[1]
            if "__" in existing_guard:
                results["results"].append(
                    result.from_config(
                        config,
                        path=path,
                        message=f"invalid header guard {existing_guard}, using '__' in a macro name is reserved",
                        level="error",
                        line=lineno,
                    )
                )
            if re.match("^_[A-Z]", existing_guard):
                results["results"].append(
                    result.from_config(
                        config,
                        path=path,
                        message=f"invalid header guard {existing_guard}, leading underscore followed by a capital letter in a macro name is reserved",
                        level="error",
                        line=lineno,
                    )
                )
        return
    guard = make_guard(topsrcdir, path)
    if fix:
        fix_guard(guard, path, raw_content, lineno)
        results["fixed"] += 1
    else:
        diff = generate_diff(guard, path, raw_content, lineno)
        results["results"].append(
            result.from_config(
                config,
                path=path,
                message="missing header guard",
                level="error",
                diff=diff,
            )
        )


def make_guard(topsrcdir, path):
    guard = f"{os.path.splitext(path[1 + len(topsrcdir) :])[0]}_H_"
    guard = re.sub(r"[/.-]", "_", guard)
    guard = re.sub("_+", "_", guard)
    guard = guard.upper()
    return guard


def insert_guard(guard, sequence, lineno):
    new_sequence = sequence + [f"#endif  // {guard}"]
    new_sequence.insert(lineno, f"#ifndef {guard}")
    new_sequence.insert(lineno + 1, f"#define {guard}")
    new_sequence.insert(lineno + 2, "")
    return new_sequence


def fix_guard(guard, path, raw_content, lineno):
    prev_content = raw_content.split("\n")
    new_content = insert_guard(guard, prev_content, lineno)
    with open(path, "w") as fd:
        fd.write("\n".join(new_content))


def generate_diff(guard, path, raw_content, lineno):
    prev_content = raw_content.split("\n")
    new_content = insert_guard(guard, prev_content, lineno)
    diff = "\n".join(
        difflib.unified_diff(prev_content, new_content, fromfile=path, tofile=path)
    )
    return diff


def lint(paths, config, **lintargs):
    results = {"results": [], "fixed": 0}
    paths = list(expand_exclusions(paths, config, lintargs["root"]))
    fix = lintargs.get("fix")

    for path in paths:
        try:
            with open(path) as fd:
                raw_content = fd.read()
        except UnicodeDecodeError:
            continue

        check_missing_header_guards(
            results, lintargs["root"], path, raw_content, config, fix
        )

    return results
