# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.treeherder import join_symbol

from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job

transforms = TransformSequence()


@transforms.add
def treeherder(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)

        # Pop out the group from the treeherder definition
        group = job.get("treeherder", {}).pop("group", "pkg-Rpk")

        # add the chunk number to the TH symbol
        symbol = job.get("treeherder", {}).get("symbol", "N")
        symbol = "{}{}".format(symbol, dep_job.attributes.get("l10n_chunk", ""))

        job.setdefault("treeherder", {})["symbol"] = join_symbol(group, symbol)

        yield job


@transforms.add
def define_upstream_artifacts(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)

        job.setdefault("attributes", {}).update(
            copy_attributes_from_dependent_job(dep_job)
        )
        if dep_job.attributes.get("chunk_locales"):
            job["attributes"]["chunk_locales"] = dep_job.attributes.get("chunk_locales")

        paths = sorted(
            p
            for p in dep_job.attributes.get("release_artifacts", [])
            if p.endswith(".pkg")
        )

        job["upstream-artifacts"] = [
            {
                "taskId": {"task-reference": f"<{dep_job.kind}>"},
                "taskType": "signing",
                "paths": paths,
                "formats": ["apple_notarization_stacked"],
            }
        ]

        job.pop("description", None)

        yield job
