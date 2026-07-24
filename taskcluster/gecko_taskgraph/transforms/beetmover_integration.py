# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.keyed_by import evaluate_keyed_by
from taskgraph.util.schema import LegacySchema, optionally_keyed_by
from voluptuous import Optional, Required

from gecko_taskgraph.transforms.beetmover import craft_release_properties
from gecko_taskgraph.transforms.task import task_description_schema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import (
    generate_beetmover_artifact_map,
    generate_beetmover_upstream_artifacts,
)

beetmover_description_schema = LegacySchema({
    Required("label"): str,
    Required("description"): str,
    Required("dependencies"): task_description_schema["dependencies"],
    Required("if-dependencies"): task_description_schema["if-dependencies"],
    Optional("treeherder"): task_description_schema["treeherder"],
    Required("run-on-projects"): task_description_schema["run-on-projects"],
    Optional("attributes"): task_description_schema["attributes"],
    Optional("task-from"): task_description_schema["task-from"],
    Required("worker-type"): task_description_schema["worker-type"],
    Required("scopes"): optionally_keyed_by("project", [str]),
    Optional("run-on-repo-type"): task_description_schema["run-on-repo-type"],
})

transforms = TransformSequence()


@transforms.add
def remove_name(config, tasks):
    for job in tasks:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(beetmover_description_schema)


@transforms.add
def make_task_description(config, tasks):
    for task in tasks:
        dep_task = get_primary_dependency(config, task)
        assert dep_task

        attributes = copy_attributes_from_dependent_job(dep_task)
        attributes.update(task.get("attributes", {}))

        treeherder = task.get("treeherder", {})
        dep_th_platform = (
            dep_task.task.get("extra", {})
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
        job["worker"] = {
            "release-properties": craft_release_properties(config, job),
            "upstream-artifacts": generate_beetmover_upstream_artifacts(
                config, job, platform, locale
            ),
            "artifact-map": generate_beetmover_artifact_map(
                config, job, platform=platform, locale=locale
            ),
        }
        yield job
