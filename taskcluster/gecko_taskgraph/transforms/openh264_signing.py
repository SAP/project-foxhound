# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the openh264 signing task into an actual task description.
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.treeherder import inherit_treeherder_from_dep, join_symbol

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import get_signing_type_per_platform

transforms = TransformSequence()


class SigningDescriptionSchema(Schema, kw_only=True):
    label: Optional[str] = None
    extra: Optional[object] = None
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


@transforms.add
def remove_name(config, jobs):
    for job in jobs:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(SigningDescriptionSchema)


@transforms.add
def make_signing_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = dep_job.attributes
        build_platform = dep_job.attributes.get("build_platform")
        is_nightly = True  # cert_scope_per_platform uses this to choose the right cert

        build_type = attributes.get("build_type")
        description = (
            f"Signing of OpenH264 Binaries for '{build_platform}/{build_type}'"
        )

        dependencies = {"openh264": dep_job.label}

        my_attributes = copy_attributes_from_dependent_job(dep_job)

        signing_type = get_signing_type_per_platform(build_platform, is_nightly, config)

        upstream_artifact = {
            "taskId": {"task-reference": "<openh264>"},
            "taskType": "build",
        }

        worker_type = "linux-signing"
        worker = {
            "implementation": "scriptworker-signing",
            "signing-type": signing_type,
        }

        if "win" in build_platform:
            upstream_artifact["formats"] = ["gcp_prod_autograph_authenticode_202412"]
        elif "mac" in build_platform:
            worker_type = "mac-signing"
            worker = {
                "implementation": "iscript",
                "signing-type": signing_type,
                "mac-behavior": "mac_single_file",
            }
            upstream_artifact["formats"] = ["mac_single_file"]
            upstream_artifact["singleFileGlobs"] = ["libgmpopenh264.dylib"]
        else:
            upstream_artifact["formats"] = ["gcp_prod_autograph_gpg"]

        version = attributes.get("openh264_version")
        if not version:
            raise Exception(f"openh264_version attribute missing from {dep_job.label}")
        my_attributes["openh264_version"] = version
        upstream_artifact["paths"] = [
            f"private/openh264/openh264-v{version}-{build_platform}.zip",
        ]
        worker["upstream-artifacts"] = [upstream_artifact]

        dep_th = dep_job.task.get("extra", {}).get("treeherder", {})
        treeherder = inherit_treeherder_from_dep(job, dep_job)
        treeherder.setdefault(
            "symbol",
            join_symbol(
                dep_th.get("groupSymbol", "?"),
                (dep_th.get("symbol") or "") + "s",
            ),
        )

        task = {
            "label": job["label"],
            "description": description,
            "worker-type": worker_type,
            "worker": worker,
            "dependencies": dependencies,
            "attributes": my_attributes,
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "treeherder": treeherder,
        }

        yield task
