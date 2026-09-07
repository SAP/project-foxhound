# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the checksums signing task into an actual task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import get_signing_type


class ChecksumsSigningDescriptionSchema(Schema, kw_only=True):
    label: Optional[str] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()


@transforms.add
def remove_name(config, jobs):
    for job in jobs:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(ChecksumsSigningDescriptionSchema)


@transforms.add
def make_checksums_signing_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = dep_job.attributes

        treeherder = job.get("treeherder", {})
        treeherder.setdefault("symbol", "css(N)")
        dep_th_platform = (
            dep_job.task
            .get("extra", {})
            .get("treeherder", {})
            .get("machine", {})
            .get("platform", "")
        )
        treeherder.setdefault("platform", f"{dep_th_platform}/opt")
        treeherder.setdefault("tier", 1)
        treeherder.setdefault("kind", "build")

        label = job["label"]
        description = "Signing of release-source checksums file"
        dependencies = {"beetmover": dep_job.label}

        attributes = copy_attributes_from_dependent_job(dep_job)

        upstream_artifacts = [
            {
                "taskId": {"task-reference": "<beetmover>"},
                "taskType": "beetmover",
                "paths": [
                    "public/target-source.checksums",
                ],
                "formats": ["gcp_prod_autograph_gpg"],
            }
        ]

        signing_type = get_signing_type(config)

        task = {
            "label": label,
            "description": description,
            "worker-type": "linux-signing",
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
