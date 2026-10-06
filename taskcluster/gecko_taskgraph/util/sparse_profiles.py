# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import functools
from pathlib import Path

from gecko_taskgraph import GECKO


@functools.cache
def _get_taskgraph_sparse_profile():
    """
    Parse the taskgraph sparse profile and return the paths and globs it includes.
    """

    # We need this nested function to handle %include directives recursively
    def parse(profile_path):
        paths = set()
        globs = set()

        full_path = Path(GECKO) / profile_path
        if not full_path.exists():
            raise FileNotFoundError(
                f"Sparse profile '{full_path.stem}' not found at {full_path}"
            )

        for raw_line in full_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or line.startswith("["):
                continue
            if line.startswith("%include "):
                included_profile = line[len("%include ") :].strip()
                included_paths, included_globs = parse(included_profile)
                paths.update(included_paths)
                globs.update(included_globs)
            elif line.startswith("path:"):
                path = line[len("path:") :].strip()
                paths.add(Path(path))
            elif line.startswith("glob:"):
                glob = line[len("glob:") :].strip()
                globs.add(glob)

        return paths, globs

    return parse("build/sparse-profiles/taskgraph")


@functools.cache
def is_path_covered_by_taskgraph_sparse_profile(path):
    """
    Check if a given path would be included in the taskgraph sparse checkout.
    """
    profile_paths, profile_globs = _get_taskgraph_sparse_profile()
    path = Path(path)

    for profile_path in profile_paths:
        if path == profile_path or profile_path in path.parents:
            return True

    # Path.match requires at least one directory for ** patterns to match
    # root-level files, so we prepend a fake parent directory
    path_with_parent = Path("_", path)
    for pattern in profile_globs:
        if path_with_parent.match(pattern):
            return True

    return False
