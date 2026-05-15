# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""Configure conditional coverage dependencies from from_deps output."""

from taskgraph.transforms.base import TransformSequence

transforms = TransformSequence()


@transforms.add
def add_dependencies(config, jobs):
    for job in jobs:
        dependencies = job.get("dependencies", {})
        if not dependencies:
            continue

        job["if-dependencies"] = list(dependencies.values())
        yield job
