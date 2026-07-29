# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the per-locale balrog task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.treeherder import replace_group

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job


class BalrogDescriptionSchema(Schema, kw_only=True):
    # unique label to describe this balrog task, defaults to balrog-{dep.label}
    label: str
    # Whether the parallel `-No-WNP` blob should be updated as well.
    update_no_wnp: bool
    # treeherder is allowed here to override any defaults we use for beetmover.  See
    # taskcluster/gecko_taskgraph/transforms/task.py for the schema details, and the
    # below transforms for defaults of various values.
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    # Shipping product / phase
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()


@transforms.add
def remove_name(config, jobs):
    for job in jobs:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(BalrogDescriptionSchema)


@transforms.add
def make_task_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        job["shipping-product"] = dep_job.attributes.get("shipping_product")

        treeherder = job.get("treeherder", {})
        treeherder.setdefault("symbol", "c-Up(N)")
        dep_th_platform = (
            dep_job.task
            .get("extra", {})
            .get("treeherder", {})
            .get("machine", {})
            .get("platform", "")
        )
        treeherder.setdefault("platform", f"{dep_th_platform}/opt")
        treeherder.setdefault(
            "tier", dep_job.task.get("extra", {}).get("treeherder", {}).get("tier", 1)
        )
        treeherder.setdefault("kind", "build")

        attributes = copy_attributes_from_dependent_job(dep_job)

        treeherder_job_symbol = dep_job.task["extra"]["treeherder"]["symbol"]
        treeherder["symbol"] = replace_group(treeherder_job_symbol, "c-Up")

        if dep_job.attributes.get("locale"):
            attributes["locale"] = dep_job.attributes.get("locale")

        label = job["label"]

        description = (
            "Balrog submission for locale '{locale}' for build '"
            "{build_platform}/{build_type}'".format(
                locale=attributes.get("locale", "en-US"),
                build_platform=attributes.get("build_platform"),
                build_type=attributes.get("build_type"),
            )
        )

        upstream_artifacts = [
            {
                "taskId": {"task-reference": "<beetmover>"},
                "taskType": "beetmover",
                "paths": ["public/manifest.json"],
            }
        ]

        dependencies = {"beetmover": dep_job.label}
        # don't block on startup-test for release/esr, they block on manual testing anyway
        if config.params["release_type"] in ("nightly", "beta"):
            for kind_dep in config.kind_dependencies_tasks.values():
                if (
                    kind_dep.kind == "startup-test"
                    and kind_dep.attributes["build_platform"]
                    == attributes.get("build_platform")
                    and kind_dep.attributes["build_type"]
                    == attributes.get("build_type")
                    and kind_dep.attributes.get("shipping_product")
                    == job.get("shipping-product")
                ):
                    dependencies["startup-test"] = kind_dep.label
        # We need the release created in balrog first
        soft_dependencies = [
            dep.label
            for dep in config.kind_dependencies_tasks.values()
            if dep.kind == "release-balrog-submit-toplevel"
            and dep.attributes.get("shipping_product") == job.get("shipping-product")
        ]

        task = {
            "label": label,
            "description": description,
            "worker-type": "balrog",
            "worker": {
                "implementation": "balrog",
                "upstream-artifacts": upstream_artifacts,
                "balrog-action": "v2-submit-locale",
                "suffixes": ["", "-No-WNP"] if job.get("update-no-wnp") else [""],
            },
            "dependencies": dependencies,
            "soft-dependencies": soft_dependencies,
            "attributes": attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "treeherder": treeherder,
            "shipping-phase": job.get("shipping-phase", "promote"),
            "shipping-product": job.get("shipping-product"),
        }

        yield task
