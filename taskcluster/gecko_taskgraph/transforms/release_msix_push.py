# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the release-msix-push kind into an actual task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import release_level
from gecko_taskgraph.util.scriptworker import add_scope_prefix


class PushMsixDescriptionSchema(Schema, kw_only=True):
    name: str
    task_from: TaskDescriptionSchema.__annotations__["task_from"]  # noqa: F821
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"]  # noqa: F821
    description: TaskDescriptionSchema.__annotations__["description"]  # noqa: F821
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"]  # noqa: F821
    run_on_projects: TaskDescriptionSchema.__annotations__["run_on_projects"]  # noqa: F821
    worker_type: str
    worker: object  # noqa: F821
    scopes: Optional[list[str]] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"]  # noqa: F821
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"]  # noqa: F821
    extra: TaskDescriptionSchema.__annotations__["extra"] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()
transforms.add_validate(PushMsixDescriptionSchema)


@transforms.add
def make_task_description(config, jobs):
    for job in jobs:
        job["worker"]["upstream-artifacts"] = generate_upstream_artifacts(
            job["dependencies"]
        )

        if release_level(config.params) == "production":
            job.setdefault("scopes", []).append(
                add_scope_prefix(
                    config,
                    "microsoftstore:{}".format(job["worker"]["channel"]),
                )
            )

        # Override shipping-phase for release: push to the Store early to
        # allow time for certification.
        if job["worker"]["publish-mode"] == "Manual":
            job["shipping-phase"] = "promote"

        yield job


def generate_upstream_artifacts(dependencies):
    return [
        {
            "taskId": {"task-reference": f"<{task_kind}>"},
            "taskType": "build",
            "paths": ["public/build/target.store.msix"],
        }
        for task_kind in dependencies.keys()
    ]
