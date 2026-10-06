# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform mac notarization tasks into actual task descriptions.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.treeherder import inherit_treeherder_from_dep, join_symbol

from gecko_taskgraph.transforms.task import TaskDescriptionSchema


class MacNotarizationDescriptionSchema(Schema, kw_only=True):
    label: Optional[str] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    worker: TaskDescriptionSchema.__annotations__["worker"] = None
    worker_type: TaskDescriptionSchema.__annotations__["worker_type"] = None
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


transforms.add_validate(MacNotarizationDescriptionSchema)


@transforms.add
def make_notarization_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        dependencies = {dep_job.kind: dep_job.label}
        build_platform = dep_job.attributes.get("build_platform")

        job["worker"]["signing-type"] = "release-apple-notarization"

        task = {
            "label": job["label"],
            "worker-type": job["worker-type"],
            "worker": job["worker"],
            "dependencies": dependencies,
            "attributes": job.get("attributes", {}),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
        }

        if config.kind == "openh264-notarization":
            _configure_openh264(task, job, dep_job, build_platform)
        elif config.kind == "geckodriver-mac-notarization":
            _configure_geckodriver(task, job, dep_job, build_platform)
        else:
            raise Exception(f"Unsupported kind for mac_notarization: {config.kind}")

        yield task


def _configure_openh264(task, job, dep_job, build_platform):
    version = task["attributes"].get("openh264_version")
    if not version:
        raise Exception(f"openh264_version attribute missing from {dep_job.label}")

    task["description"] = (
        f"Mac notarization - OpenH264 plugin for build '{build_platform}'"
    )

    dep_th = dep_job.task.get("extra", {}).get("treeherder", {})
    treeherder = inherit_treeherder_from_dep(job, dep_job)
    treeherder.setdefault(
        "symbol",
        join_symbol(dep_th.get("groupSymbol", "?"), "BN"),
    )
    task["treeherder"] = treeherder

    task["worker"]["upstream-artifacts"] = [
        {
            "taskId": {"task-reference": "<openh264-signing>"},
            "taskType": "signing",
            "paths": [
                f"private/openh264/openh264-v{version}-{build_platform}.zip",
            ],
            "formats": ["apple_notarization_openh264_plugin"],
        }
    ]

    task["run-on-projects"] = dep_job.attributes.get("run_on_projects")


def _configure_geckodriver(task, job, dep_job, build_platform):
    treeherder = job.get("treeherder", {})
    dep_treeherder = dep_job.task.get("extra", {}).get("treeherder", {})
    treeherder.setdefault(
        "platform", dep_job.task.get("extra", {}).get("treeherder-platform")
    )
    treeherder.setdefault("tier", dep_treeherder.get("tier", 1))
    treeherder.setdefault("kind", "build")
    task["treeherder"] = treeherder

    task["description"] = f"Mac notarization - Geckodriver for build '{build_platform}'"

    platform = build_platform.rsplit("-", 1)[0]
    task["run-on-projects"] = ["mozilla-central"]
    task["index"] = {"product": "geckodriver", "job-name": f"{platform}-notarized"}
