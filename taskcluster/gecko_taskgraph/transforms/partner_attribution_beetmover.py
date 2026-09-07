# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover task into an actual task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.taskcluster import get_artifact_prefix

from gecko_taskgraph.transforms.beetmover import craft_release_properties
from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import (
    copy_attributes_from_dependent_job,
)
from gecko_taskgraph.util.partners import (
    apply_partner_priority,
)
from gecko_taskgraph.util.scriptworker import (
    add_scope_prefix,
    get_beetmover_bucket_scope,
)


class BeetmoverDescriptionSchema(Schema, kw_only=True):
    # from the loader:
    task_from: Optional[str] = None
    name: Optional[str] = None
    # from the from_deps transforms:
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    # depname is used in taskref's to identify the taskID of the unsigned things
    depname: str = "build"
    # unique label to describe this beetmover task, defaults to {dep.label}-beetmover
    label: Optional[str] = None
    partner_path: str
    extra: Optional[object] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"]  # noqa: F821
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    priority: TaskDescriptionSchema.__annotations__["priority"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()
transforms.add_validate(BeetmoverDescriptionSchema)
transforms.add(apply_partner_priority)


@transforms.add
def populate_scopes_and_upstream_artifacts(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        upstream_artifacts = dep_job.attributes["release_artifacts"]
        prefix = get_artifact_prefix(dep_job)
        artifacts = []
        for artifact in upstream_artifacts:
            partner, sub_partner, platform, locale, _ = artifact.replace(
                prefix + "/", ""
            ).split("/", 4)
            artifacts.append((artifact, partner, sub_partner, platform, locale))

        action_scope = add_scope_prefix(config, "beetmover:action:push-to-partner")
        bucket_scope = get_beetmover_bucket_scope(config)
        repl_dict = {
            "build_number": config.params["build_number"],
            "release_partner_build_number": config.params[
                "release_partner_build_number"
            ],
            "version": config.params["version"],
            "partner": "{partner}",  # we'll replace these later, per artifact
            "subpartner": "{subpartner}",
            "platform": "{platform}",
            "locale": "{locale}",
        }
        job["scopes"] = [bucket_scope, action_scope]

        partner_path = job["partner-path"].format(**repl_dict)
        job.setdefault("worker", {})["upstream-artifacts"] = (
            generate_upstream_artifacts(dep_job.kind, artifacts, partner_path)
        )

        yield job


@transforms.add
def make_task_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = dep_job.attributes
        build_platform = attributes.get("build_platform")
        if not build_platform:
            raise Exception("Cannot find build platform!")

        description = "Beetmover for partner attribution"
        attributes = copy_attributes_from_dependent_job(dep_job)

        task = {
            "label": "{}-{}".format(config.kind, job["name"]),
            "description": description,
            "dependencies": {dep_job.kind: dep_job.label},
            "attributes": attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "shipping-phase": job["shipping-phase"],
            "shipping-product": job.get("shipping-product"),
            "worker": job["worker"],
            "scopes": job["scopes"],
        }
        # we may have reduced the priority for partner jobs, otherwise task.py will set it
        if job.get("priority"):
            task["priority"] = job["priority"]

        yield task


def generate_upstream_artifacts(attribution_task_kind, artifacts, partner_path):
    upstream_artifacts = []
    for artifact, partner, subpartner, platform, locale in artifacts:
        upstream_artifacts.append({
            "taskId": {"task-reference": f"<{attribution_task_kind}>"},
            "taskType": "repackage",
            "paths": [artifact],
            "locale": partner_path.format(
                partner=partner,
                subpartner=subpartner,
                platform=platform,
                locale=locale,
            ),
        })

    if not upstream_artifacts:
        raise Exception("Couldn't find any upstream artifacts.")

    return upstream_artifacts


@transforms.add
def make_task_worker(config, jobs):
    for job in jobs:
        job["worker-type"] = "beetmover"
        worker = {
            "implementation": "beetmover",
            "release-properties": craft_release_properties(config, job),
        }
        job["worker"].update(worker)

        yield job
