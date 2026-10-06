# This Source Code Form is subject to the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import re

from mozlint import result
from mozlint.pathutils import expand_exclusions

# Must stay in sync with WPT_SUBSUITES in taskcluster/gecko_taskgraph/util/chunking.py.
# The chunking logic routes tests to subsuite CI jobs by checking whether the test's
# directory path contains one of these strings. Tests in matching directories that lack
# the corresponding tag will be excluded from all CI jobs.
WPT_SUBSUITE_PATHS = {
    "canvas": ["html/canvas"],
    "webgpu": ["webgpu"],
    "webcodecs": ["webcodecs"],
    "eme": ["encrypted-media"],
}
# Must stay in sync with WPT_SUBSUITES in taskcluster/gecko_taskgraph/util/chunking.py.

_TESTS_META_PAIRS = [
    ("testing/web-platform/tests", "testing/web-platform/meta"),
    ("testing/web-platform/mozilla/tests", "testing/web-platform/mozilla/meta"),
]

_TAGS_RE = re.compile(r"^\s*tags:\s*\[([^\]]*)\]")


def _get_ini_tags(ini_path):
    tags = set()
    try:
        with open(ini_path) as f:
            for line in f:
                m = _TAGS_RE.match(line)
                if m:
                    for tag in m.group(1).split(","):
                        tags.add(tag.strip())
    except OSError:
        pass
    return tags


def _effective_tags(rel_path, meta_root):
    tags = set()

    tags |= _get_ini_tags(os.path.join(meta_root, rel_path + ".ini"))

    parts = rel_path.replace(os.sep, "/").split("/")
    for depth in range(len(parts)):
        tags |= _get_ini_tags(os.path.join(meta_root, *parts[:depth], "__dir__.ini"))

    return tags


def lint(paths, config, fix=None, **lintargs):
    results = []
    root = lintargs["root"]

    for path in expand_exclusions(paths, config, root):
        for tests_root, meta_root in _TESTS_META_PAIRS:
            abs_tests_root = os.path.join(root, tests_root)
            if not path.startswith(abs_tests_root + os.sep):
                continue

            rel_path = os.path.relpath(path, abs_tests_root)
            url_dir = "/".join(rel_path.replace(os.sep, "/").split("/")[:-1]) + "/"

            for subsuite, subsuite_paths in WPT_SUBSUITE_PATHS.items():
                if not any(p in url_dir for p in subsuite_paths):
                    continue

                tags = _effective_tags(rel_path, os.path.join(root, meta_root))
                if not any(t == subsuite or t.startswith(subsuite + "-") for t in tags):
                    results.append(
                        result.from_config(
                            config,
                            path=path,
                            lineno=1,
                            message=(
                                f"Test is in a '{subsuite}' subsuite directory but has no "
                                f"'{subsuite}' tag in its metadata. It will not run in any "
                                f"CI job. Add 'tags: [{subsuite}]' to the test's .ini file "
                                f"or a parent __dir__.ini."
                            ),
                            level="error",
                        )
                    )

    return {"results": results, "fixed": 0}
