# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the signing task into an actual task description.
"""

import copy

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.keyed_by import evaluate_keyed_by

from gecko_taskgraph.util.attributes import release_level

transforms = TransformSequence()

PROVISIONING_PROFILE_FILENAMES = {
    "firefox": "orgmozillafirefox.provisionprofile",
    "devedition": "orgmozillafirefoxdeveloperedition.provisionprofile",
    "nightly": "orgmozillanightly.provisionprofile",
}


@transforms.add
def add_hardened_sign_config(config, jobs):
    for job in jobs:
        if (
            "signing" not in config.kind
            or "macosx" not in job["attributes"]["build_platform"]
        ):
            yield job
            continue

        dep_job = get_primary_dependency(config, job)
        assert dep_job
        project_level = release_level(config.params)
        is_shippable = dep_job.attributes.get("shippable", False)
        hardened_signing_type = "developer"

        # If project is production AND shippable build, then use production entitlements
        #  Note: debug builds require developer entitlements
        if project_level == "production" and is_shippable:
            hardened_signing_type = "production"

        # Evaluating can mutate the original config, so we must deepcopy
        hardened_sign_config = evaluate_keyed_by(
            copy.deepcopy(config.graph_config["mac-signing"]["hardened-sign-config"]),
            "hardened-sign-config",
            {"hardened-signing-type": hardened_signing_type},
        )
        if not isinstance(hardened_sign_config, list):
            raise Exception("hardened-sign-config must be a list")

        for sign_cfg in hardened_sign_config:
            if isinstance(sign_cfg.get("entitlements"), dict):
                sign_cfg["entitlements"] = evaluate_keyed_by(
                    sign_cfg["entitlements"],
                    "entitlements",
                    {
                        "build-platform": dep_job.attributes.get("build_platform"),
                        "project": config.params["project"],
                    },
                )
            if "only-if-milestone-is-nightly" in sign_cfg and not isinstance(
                sign_cfg.get("only-if-milestone-is-nightly"), bool
            ):
                raise Exception("only-if-milestone-is-nightly must be a bool")

        # Simulate the computation of milestone.is_nightly by init.configure.
        # We do not account for --as-milestone, which is fine because this
        # option is only used by nightly-as-release macOS builds, and those
        # builds do not have enable-build-signing set.
        milestone_is_nightly = config.params["version"].endswith("a1")

        hardened_sign_config = [
            sign_cfg
            for sign_cfg in hardened_sign_config
            if not sign_cfg.pop("only-if-milestone-is-nightly", False)
            or milestone_is_nightly
        ]

        job["worker"]["hardened-sign-config"] = hardened_sign_config
        job["worker"]["mac-behavior"] = "mac_sign_and_pkg_hardened"
        yield job


@transforms.add
def add_provisioning_profile_config(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job
        if (
            # Ensure signing task
            "signing" in config.kind
            # Ensure macosx platform
            and "macosx" in job["attributes"]["build_platform"]
            # Ensure project is considered production
            and release_level(config.params) == "production"
            # Ensure build is shippable
            and dep_job.attributes.get("shippable", False)
        ):
            # Note that the check order here is important, as mozilla-central can build devedition
            if "devedition" in dep_job.attributes.get("build_platform", ""):
                # Devedition
                filename = PROVISIONING_PROFILE_FILENAMES["devedition"]
            elif config.params["project"] == "mozilla-central":
                # Nightly
                filename = PROVISIONING_PROFILE_FILENAMES["nightly"]
            else:
                # Release, beta, esr and variants should all use default firefox app id
                # For full list of projects, see RELEASE_PROJECTS in taskcluster/gecko_taskgraph/util/attributes.py
                filename = PROVISIONING_PROFILE_FILENAMES["firefox"]

            job["worker"]["provisioning-profile-config"] = [
                {
                    "profile_name": filename,
                    "target_path": "/Contents/embedded.provisionprofile",
                },
            ]
        yield job


@transforms.add
def add_upstream_signing_resources(config, jobs):
    """
    Add the upstream signing resources to the job payload
    """
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        upstream_files = set()
        for cfg in job["worker"].get("hardened-sign-config", []):
            if "entitlements" in cfg:
                upstream_files.add(cfg["entitlements"])

        task_ref = f"<{dep_job.kind}>"
        task_type = "build"
        if "notarization" in dep_job.kind:
            task_type = "scriptworker"
        job["worker"].setdefault("upstream-artifacts", []).append({
            "paths": sorted(upstream_files),
            "taskId": {"task-reference": task_ref},
            "taskType": task_type,
            "formats": [],  # Not for signing
        })
        yield job
