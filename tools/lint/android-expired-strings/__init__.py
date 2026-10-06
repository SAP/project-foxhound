# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import re
import xml.etree.ElementTree as ET
from pathlib import Path

from mozlint import result

MOZ_NS = "http://mozac.org/tools"
MOBILE_ANDROID = Path("mobile", "android")
SOURCE_EXTENSIONS = {".kt", ".java", ".xml"}
SKIP_DIRS = {"build", ".gradle", ".idea", "node_modules", ".git"}

PROJECTS = {
    "fenix": "fenix",
    "focus-android": "focus",
    "android-components": "ac",
}


def _is_en_us_strings_xml(filepath):
    parts = Path(filepath).parts
    return (
        len(parts) >= 3
        and parts[-1] == "strings.xml"
        and parts[-2] == "values"
        and parts[-3] == "res"
    )


def _is_source_file(filepath, root):
    try:
        rel = Path(filepath).relative_to(Path(root) / MOBILE_ANDROID)
    except ValueError:
        return False
    return "src" in rel.parts


def _get_project(filepath, root):
    try:
        rel = Path(filepath).relative_to(Path(root) / MOBILE_ANDROID)
    except ValueError:
        return None
    return PROJECTS.get(rel.parts[0])


def _parse_strings_xml(root):
    """Return (deprecated, active) dicts keyed by project, parsed from
    en-US values/strings.xml files under mobile/android."""
    deprecated = {}
    active = {}

    mobile_android = Path(root) / MOBILE_ANDROID
    for strings_xml in mobile_android.rglob("values/strings.xml"):
        rel = strings_xml.relative_to(mobile_android)
        if any(p in SKIP_DIRS for p in rel.parts):
            continue

        project = _get_project(strings_xml, root)
        if project is None:
            continue

        try:
            tree = ET.parse(strings_xml)
        except ET.ParseError:
            continue

        for elem in tree.getroot():
            if elem.tag != "string":
                continue
            name = elem.get("name")
            if not name:
                continue
            removed_in = elem.get(f"{{{MOZ_NS}}}removedIn")
            if removed_in:
                deprecated.setdefault(project, {})[name] = removed_in
            else:
                active.setdefault(project, set()).add(name)

    return deprecated, active


def _visible_deprecated(deprecated, active, project):
    """Deprecated strings from the project itself, plus AC strings for Fenix/Focus
    (their own active strings shadow same-named AC ones)."""
    visible = dict(deprecated.get(project, {}))
    if project in ("fenix", "focus"):
        own_active = active.get(project, set())
        for name, version in deprecated.get("ac", {}).items():
            if name not in own_active:
                visible.setdefault(name, version)
    return visible


def _find_all_source_files(root):
    mobile_android = Path(root) / MOBILE_ANDROID
    for path in mobile_android.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(mobile_android)
        if any(p in SKIP_DIRS for p in rel.parts):
            continue
        if path.suffix not in SOURCE_EXTENSIONS:
            continue
        if path.name == "strings.xml":
            continue
        if any(p.startswith("values-") for p in rel.parts):
            continue
        if not _is_source_file(path, root):
            continue
        yield str(path)


def _compile_patterns(deprecated):
    """Pre-compile one regex per deprecated string name."""
    return {
        name: re.compile(
            r"(?:R\.string\.|@string/)" + re.escape(name) + r"(?![a-zA-Z0-9_])"
        )
        for name in deprecated
    }


def _check_file_for_references(filepath, deprecated, patterns, config, results):
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
    except (OSError, UnicodeDecodeError):
        return

    lines = content.splitlines()

    for name, version in deprecated.items():
        if name not in content:
            continue

        pattern = patterns[name]

        for lineno, line in enumerate(lines, start=1):
            if pattern.search(line):
                res = {
                    "path": filepath,
                    "lineno": lineno,
                    "message": (
                        f'Reference to string "{name}" which is marked '
                        f"for removal (moz:removedIn={version})"
                    ),
                    "level": "error",
                    "rule": "expired-string-reference",
                }
                results.append(result.from_config(config, **res))


def lint(paths, config, fix=None, **lintargs):
    root = lintargs["root"]
    results = []

    deprecated, active = _parse_strings_xml(root)
    if not deprecated:
        return results

    # When a strings.xml is among the modified files, do a full scan so we
    # catch references in files the developer did not touch.
    if any(_is_en_us_strings_xml(p) for p in paths):
        files_to_check = _find_all_source_files(root)
    else:
        files_to_check = [
            p
            for p in paths
            if Path(p).name != "strings.xml" and _is_source_file(p, root)
        ]

    visible_cache = {}
    pattern_cache = {}
    for filepath in files_to_check:
        project = _get_project(filepath, root)
        if project is None:
            continue
        if project not in visible_cache:
            visible_cache[project] = _visible_deprecated(deprecated, active, project)
            if visible_cache[project]:
                pattern_cache[project] = _compile_patterns(visible_cache[project])
        visible = visible_cache[project]
        if not visible:
            continue
        _check_file_for_references(
            filepath, visible, pattern_cache[project], config, results
        )

    return results
