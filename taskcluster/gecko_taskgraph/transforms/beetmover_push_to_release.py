# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the beetmover-push-to-release task into a task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import Schema, taskref_or_string_msgspec

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.scriptworker import (
    add_scope_prefix,
    get_beetmover_bucket_scope,
)


class BeetmoverPushToReleaseDescriptionSchema(Schema, kw_only=True):
    name: str
    product: str
    treeherder_platform: str
    attributes: Optional[dict[str, object]] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    run: Optional[dict[str, object]] = None
    run_on_projects: TaskDescriptionSchema.__annotations__["run_on_projects"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None
    dependencies: Optional[dict[str, taskref_or_string_msgspec]] = None
    index: Optional[dict[str, str]] = None
    routes: Optional[list[str]] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"]  # noqa: F821
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"]  # noqa: F821
    extra: TaskDescriptionSchema.__annotations__["extra"] = None


transforms = TransformSequence()
transforms.add_validate(BeetmoverPushToReleaseDescriptionSchema)


@transforms.add
def make_beetmover_push_to_release_description(config, jobs):
    for job in jobs:
        treeherder = job.get("treeherder", {})
        treeherder.setdefault("symbol", "Rel(BM-C)")
        treeherder.setdefault("tier", 1)
        treeherder.setdefault("kind", "build")
        treeherder.setdefault("platform", job["treeherder-platform"])

        label = job["name"]
        description = "Beetmover push to release for '{product}'".format(
            product=job["product"]
        )

        bucket_scope = get_beetmover_bucket_scope(config)
        action_scope = add_scope_prefix(config, "beetmover:action:push-to-releases")

        task = {
            "label": label,
            "description": description,
            "worker-type": "beetmover",
            "scopes": [bucket_scope, action_scope],
            "product": job["product"],
            "dependencies": job["dependencies"],
            "attributes": job.get("attributes", {}),
            "run-on-projects": job.get("run-on-projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "treeherder": treeherder,
            "shipping-phase": job.get("shipping-phase", "push"),
            "shipping-product": job.get("shipping-product"),
            "routes": job.get("routes", []),
            "extra": job.get("extra", {}),
            "worker": job.get("worker", {}),
        }

        yield task


@transforms.add
def make_beetmover_push_to_release_worker(config, jobs):
    for job in jobs:
        worker = {
            "implementation": "beetmover-push-to-release",
            "product": job["product"],
        }
        job["worker"] = worker
        del job["product"]

        yield job
