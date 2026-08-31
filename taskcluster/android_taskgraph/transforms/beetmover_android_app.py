# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover task into an actual task description.
"""

import logging
from typing import Optional

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.scriptworker import generate_beetmover_artifact_map
from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import Schema, optionally_keyed_by, resolve_keyed_by

logger = logging.getLogger(__name__)


class BeetmoverWorkerSchema(Schema, forbid_unknown_fields=False, kw_only=True):
    upstream_artifacts: list[dict]


class BeetmoverDescriptionSchema(Schema, forbid_unknown_fields=False, kw_only=True):
    # unique name to describe this beetmover task, defaults to {dep.label}-beetmover
    name: str
    worker: BeetmoverWorkerSchema
    # treeherder is allowed here to override any defaults we use for beetmover.
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    bucket_scope: Optional[  # type: ignore
        optionally_keyed_by("level", "build-type", str, use_msgspec=True)
    ] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()
transforms.add_validate(BeetmoverDescriptionSchema)


@transforms.add
def make_task_description(config, tasks):
    for task in tasks:
        attributes = task["attributes"]

        label = "beetmover-{}".format(task["name"])
        description = "Beetmover submission for build type '{build_type}'".format(
            build_type=attributes.get("build-type"),
        )

        if task.get("locale"):
            attributes["locale"] = task["locale"]

        resolve_keyed_by(
            task,
            "bucket-scope",
            item_name=task["name"],
            **{
                "build-type": task["attributes"]["build-type"],
                "level": config.params["level"],
            },
        )
        bucket_scope = task.pop("bucket-scope")

        taskdesc = {
            "label": label,
            "description": description,
            "worker-type": "beetmover-android",
            "worker": task["worker"],
            "scopes": [
                bucket_scope,
                "project:releng:beetmover:action:direct-push-to-bucket",
            ],
            "dependencies": task["dependencies"],
            "attributes": attributes,
            "treeherder": task["treeherder"],
            "run-on-repo-type": task.get("run-on-repo-type", ["git", "hg"]),
        }

        yield taskdesc


_STAGING_PREFIX = "staging-"


def craft_release_properties(config, task):
    params = config.params

    return {
        "app-name": "fenix",  # TODO: Support focus
        "app-version": str(params["version"]),
        "branch": params["project"],
        "build-id": str(params["moz_build_date"]),
        "hash-type": "sha512",
        "platform": "android",
    }


@transforms.add
def make_task_worker(config, tasks):
    for task in tasks:
        locale = task["attributes"].get("locale")
        build_type = task["attributes"]["build-type"]

        task["worker"].update({
            "implementation": "beetmover",
            "release-properties": craft_release_properties(config, task),
            "artifact-map": generate_beetmover_artifact_map(
                config, task, platform=build_type, locale=locale
            ),
        })

        if locale:
            task["worker"]["locale"] = locale

        yield task
