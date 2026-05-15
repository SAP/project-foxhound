# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover-repackage-rpm task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import LegacySchema
from taskgraph.util.treeherder import inherit_treeherder_from_dep, replace_group
from voluptuous import Required

from gecko_taskgraph.transforms.beetmover import craft_release_properties
from gecko_taskgraph.transforms.task import task_description_schema
from gecko_taskgraph.util.scriptworker import (
    generate_beetmover_artifact_map,
    generate_beetmover_upstream_artifacts,
    get_beetmover_action_scope,
    get_beetmover_bucket_scope,
)

transforms = TransformSequence()

beetmover_description_schema = LegacySchema({
    Required("attributes"): task_description_schema["attributes"],
    Required("dependencies"): task_description_schema["dependencies"],
    Required("label"): str,
    Required("name"): str,
    Required("shipping-phase"): task_description_schema["shipping-phase"],
    Required("task-from"): task_description_schema["task-from"],
})

transforms.add_validate(beetmover_description_schema)


@transforms.add
def make_beetmover_rpm_task(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = job["attributes"]
        platform = attributes["build_platform"]

        bucket_scope = get_beetmover_bucket_scope(config)
        action_scope = get_beetmover_action_scope(config)

        dependencies = {"repackage-rpm-signing": dep_job.label}
        treeherder = inherit_treeherder_from_dep(job, dep_job)
        upstream_symbol = dep_job.task["extra"]["treeherder"]["symbol"]
        treeherder.setdefault("symbol", replace_group(upstream_symbol, "BMR"))

        task = {
            "label": job["label"],
            "description": f"Publish RPM packages for {platform}",
            "worker-type": "beetmover",
            "scopes": [bucket_scope, action_scope],
            "dependencies": dependencies,
            "attributes": attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "treeherder": treeherder,
            "shipping-phase": job["shipping-phase"],
            "shipping-product": job.get("shipping-product"),
        }

        locales = ["en-US"]
        for dep_task in config.kind_dependencies_tasks.values():
            if dep_task.kind in ("shippable-l10n-signing", "l10n"):
                if dep_task.attributes.get("build_platform") == platform:
                    task_locales = dep_task.attributes.get(
                        "chunk_locales", dep_task.attributes.get("all_locales", [])
                    )
                    locales.extend(task_locales)

        task["worker"] = {
            "implementation": "beetmover",
            "release-properties": craft_release_properties(config, task),
            "upstream-artifacts": generate_beetmover_upstream_artifacts(
                config, task, platform=platform, locale=locales
            ),
            "artifact-map": generate_beetmover_artifact_map(
                config, task, platform=platform, locale=locales
            ),
        }

        yield task
