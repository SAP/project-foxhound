# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform release-beetmover-langpack-checksums into an actual task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.treeherder import inherit_treeherder_from_dep

from gecko_taskgraph.transforms.beetmover import craft_release_properties
from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import (
    generate_beetmover_artifact_map,
    generate_beetmover_upstream_artifacts,
    get_beetmover_action_scope,
    get_beetmover_bucket_scope,
)


class BeetmoverChecksumsDescriptionSchema(Schema, kw_only=True):
    attributes: TaskDescriptionSchema.__annotations__["attributes"]  # noqa: F821
    label: Optional[str] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    locale: Optional[str] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


transforms = TransformSequence()


@transforms.add
def remove_name(config, jobs):
    for job in jobs:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(BeetmoverChecksumsDescriptionSchema)


@transforms.add
def make_beetmover_checksums_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = dep_job.attributes

        treeherder = inherit_treeherder_from_dep(job, dep_job)
        treeherder.setdefault(
            "symbol", "BMcslang(N{})".format(attributes.get("l10n_chunk", ""))
        )

        label = job["label"]
        build_platform = attributes.get("build_platform")

        description = "Beetmover submission of checksums for langpack files"

        extra = {}
        if "devedition" in build_platform:
            extra["product"] = "devedition"
        else:
            extra["product"] = "firefox"

        dependencies = {dep_job.kind: dep_job.label}
        for k, v in dep_job.dependencies.items():
            if k.startswith("beetmover"):
                dependencies[k] = v

        attributes = copy_attributes_from_dependent_job(dep_job)
        if "chunk_locales" in dep_job.attributes:
            attributes["chunk_locales"] = dep_job.attributes["chunk_locales"]
        attributes.update(job.get("attributes", {}))

        bucket_scope = get_beetmover_bucket_scope(config)
        action_scope = get_beetmover_action_scope(config)

        task = {
            "label": label,
            "description": description,
            "worker-type": "beetmover",
            "scopes": [bucket_scope, action_scope],
            "dependencies": dependencies,
            "attributes": attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "treeherder": treeherder,
            "extra": extra,
        }

        if "shipping-phase" in job:
            task["shipping-phase"] = job["shipping-phase"]

        if "shipping-product" in job:
            task["shipping-product"] = job["shipping-product"]

        yield task


@transforms.add
def make_beetmover_checksums_worker(config, jobs):
    for job in jobs:
        valid_beetmover_job = len(job["dependencies"]) == 1
        if not valid_beetmover_job:
            raise NotImplementedError("Beetmover checksums must have one dependency.")

        locales = job["attributes"].get("chunk_locales")
        platform = job["attributes"]["build_platform"]

        refs = {
            "beetmover": None,
        }
        for dependency in job["dependencies"].keys():
            if dependency.startswith("release-beetmover"):
                refs["beetmover"] = f"<{dependency}>"
        if None in refs.values():
            raise NotImplementedError(
                "Beetmover checksums must have a beetmover dependency!"
            )

        worker = {
            "implementation": "beetmover",
            "release-properties": craft_release_properties(config, job),
            "upstream-artifacts": generate_beetmover_upstream_artifacts(
                config, job, platform, locales
            ),
            "artifact-map": generate_beetmover_artifact_map(
                config, job, platform=platform, locale=locales
            ),
        }

        job["worker"] = worker

        yield job
