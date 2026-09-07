# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Apply some defaults and minor modifications to the jobs defined in the
APK and AAB signing kinds.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import resolve_keyed_by

transforms = TransformSequence()

PRODUCTION_SIGNING_BUILD_TYPES = [
    "focus-nightly",
    "focus-beta",
    "focus-release",
    "klar-release",
    "fenix-nightly",
    "fenix-beta",
    "fenix-release",
    "fenix-beta-mozillaonline",
    "fenix-release-mozillaonline",
]


@transforms.add
def resolve_keys(config, tasks):
    for task in tasks:
        for key in (
            "index",
            "signing-format",
            "notifications",
            "treeherder.platform",
        ):
            resolve_keyed_by(
                task,
                key,
                item_name=task["name"],
                **{
                    "build-type": task["attributes"]["build-type"],
                    "level": config.params["level"],
                },
            )
        yield task


@transforms.add
def set_worker_type(config, tasks):
    for task in tasks:
        worker_type = "linux-depsigning"
        if (
            str(config.params["level"]) == "3"
            and task["attributes"]["build-type"] in PRODUCTION_SIGNING_BUILD_TYPES
        ):
            worker_type = "linux-signing"
        task["worker-type"] = worker_type
        yield task


@transforms.add
def set_signing_type(config, tasks):
    for task in tasks:
        signing_type = "dep-signing"
        if str(config.params["level"]) == "3":
            if task["attributes"]["build-type"] in ("fenix-beta", "fenix-release"):
                signing_type = "fennec-production-signing"
            elif task["attributes"]["build-type"] in PRODUCTION_SIGNING_BUILD_TYPES:
                signing_type = "production-signing"
        task["worker"]["signing-type"] = signing_type
        yield task


@transforms.add
def set_index_job_name(config, tasks):
    for task in tasks:
        if task.get("index"):
            task["index"]["job-name"] = task["attributes"]["build-type"]
        yield task


@transforms.add
def set_signing_attributes(config, tasks):
    for task in tasks:
        task["attributes"]["signed"] = True
        yield task


@transforms.add
def set_signing_format(config, tasks):
    for task in tasks:
        signing_format = task.pop("signing-format")
        for upstream_artifact in task["worker"]["upstream-artifacts"]:
            upstream_artifact["formats"] = [signing_format]
        yield task
