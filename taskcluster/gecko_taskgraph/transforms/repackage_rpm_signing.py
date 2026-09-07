# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the repackage-rpm-signing task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.treeherder import inherit_treeherder_from_dep

from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import get_signing_type_per_platform

transforms = TransformSequence()


@transforms.add
def make_task_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        treeherder = inherit_treeherder_from_dep(job, dep_job)

        label = job["label"]

        dependencies = {dep_job.kind: dep_job.label}
        dependencies.update(dep_job.dependencies)

        attributes = copy_attributes_from_dependent_job(dep_job)

        upstream_artifacts = [
            {
                "taskId": {"task-reference": f"<{dep_job.kind}>"},
                "taskType": "repackage",
                "paths": [artifact],
                "formats": ["autograph_rpmsign"],
            }
            for artifact in dep_job.attributes.get("release_artifacts", [])
        ]

        build_platform = attributes.get("build_platform")
        is_shippable = dep_job.attributes.get("shippable")
        signing_type = get_signing_type_per_platform(
            build_platform, is_shippable, config
        )

        task = {
            "label": label,
            "description": f"{dep_job.description} rpm signing",
            "worker-type": "linux-signing" if is_shippable else "linux-depsigning",
            "worker": {
                "implementation": "scriptworker-signing",
                "signing-type": signing_type,
                "upstream-artifacts": upstream_artifacts,
            },
            "dependencies": dependencies,
            "attributes": attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "treeherder": treeherder,
        }

        yield task
