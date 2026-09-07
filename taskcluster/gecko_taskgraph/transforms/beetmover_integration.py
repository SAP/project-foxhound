# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.keyed_by import evaluate_keyed_by
from taskgraph.util.schema import Schema, optionally_keyed_by

from gecko_taskgraph.transforms.beetmover import craft_release_properties
from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import (
    generate_beetmover_artifact_map,
    generate_beetmover_upstream_artifacts,
)


class BeetmoverDescriptionSchema(Schema, kw_only=True):
    label: str
    description: str
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"]  # noqa: F821
    if_dependencies: TaskDescriptionSchema.__annotations__["if_dependencies"]  # noqa: F821
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    run_on_projects: TaskDescriptionSchema.__annotations__["run_on_projects"]  # noqa: F821
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    worker_type: TaskDescriptionSchema.__annotations__["worker_type"]  # noqa: F821
    scopes: optionally_keyed_by("project", list[str], use_msgspec=True)  # type: ignore
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()


@transforms.add
def remove_name(config, tasks):
    for job in tasks:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(BeetmoverDescriptionSchema)


@transforms.add
def make_task_description(config, tasks):
    for task in tasks:
        dep_task = get_primary_dependency(config, task)
        assert dep_task

        attributes = copy_attributes_from_dependent_job(dep_task)
        attributes.update(task.get("attributes", {}))

        treeherder = task.get("treeherder", {})
        dep_th_platform = (
            dep_task.task
            .get("extra", {})
            .get("treeherder", {})
            .get("machine", {})
            .get("platform", "")
        )
        treeherder.setdefault("platform", f"{dep_th_platform}/opt")

        task["description"] = task["description"].format(
            build_platform=attributes.get("build_platform"),
            build_type=attributes.get("build_type"),
        )

        task["scopes"] = evaluate_keyed_by(
            task["scopes"],
            "beetmover-integration",
            {"project": config.params.get("project")},
        )

        if task.get("locale"):
            attributes["locale"] = task["locale"]
        task["attributes"] = attributes

        yield task


@transforms.add
def make_task_worker(config, jobs):
    for job in jobs:
        locale = job["attributes"].get("locale")
        platform = job["attributes"]["build_platform"]
        release_properties = craft_release_properties(config, job)
        if platform.startswith("android"):
            # craft_release_properties defaults to "Fennec" for android labels,
            # but beetmoverscript's product_buckets config only has "fenix"
            release_properties["app-name"] = "fenix"
        job["worker"] = {
            "release-properties": release_properties,
            "upstream-artifacts": generate_beetmover_upstream_artifacts(
                config, job, platform, locale
            ),
            "artifact-map": generate_beetmover_artifact_map(
                config, job, platform=platform, locale=locale
            ),
        }
        yield job
