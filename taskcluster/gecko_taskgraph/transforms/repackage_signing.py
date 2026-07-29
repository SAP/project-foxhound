# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the repackage signing task into an actual task description.
"""

import os
from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import get_signing_type_per_platform


class RepackageSigningDescriptionSchema(Schema, kw_only=True):
    label: Optional[str] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    shipping_product: TaskDescriptionSchema.__annotations__["shipping_product"] = None
    shipping_phase: TaskDescriptionSchema.__annotations__["shipping_phase"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None


SIGNING_FORMATS = {
    "target.installer.exe": ["gcp_prod_autograph_authenticode_202412_stub"],
    "target.stub-installer.exe": ["gcp_prod_autograph_authenticode_202412_stub"],
    "target.installer.msi": ["gcp_prod_autograph_authenticode_202412"],
    "target.installer.msix": ["gcp_prod_autograph_authenticode_202412"],
}

transforms = TransformSequence()


@transforms.add
def remove_name(config, jobs):
    for job in jobs:
        if "name" in job:
            del job["name"]
        yield job


transforms.add_validate(RepackageSigningDescriptionSchema)


@transforms.add
def make_repackage_signing_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        attributes = copy_attributes_from_dependent_job(dep_job)
        locale = attributes.get("locale", dep_job.attributes.get("locale"))
        attributes["repackage_type"] = "repackage-signing"

        treeherder = job.get("treeherder", {})
        treeherder.setdefault("symbol", "rs(B)")
        dep_th_platform = dep_job.task.get("extra", {}).get("treeherder-platform")
        treeherder.setdefault("platform", dep_th_platform)
        treeherder.setdefault(
            "tier", dep_job.task.get("extra", {}).get("treeherder", {}).get("tier", 1)
        )
        treeherder.setdefault("kind", "build")

        if locale:
            treeherder["symbol"] = f"rs({locale})"

        if config.kind == "repackage-signing-msi":
            treeherder["symbol"] = "MSIs({})".format(locale or "N")

        elif config.kind in (
            "repackage-signing-msix",
            "repackage-signing-shippable-l10n-msix",
        ):
            # Like "MSIXs(Bs-multi)".
            treeherder["symbol"] = "MSIXs({})".format(
                dep_job.task.get("extra", {}).get("treeherder", {}).get("symbol", "B")
            )

        label = job["label"]

        dep_kind = dep_job.kind
        if "l10n" in dep_kind:
            dep_kind = "repackage"

        dependencies = {dep_kind: dep_job.label}

        signing_dependencies = dep_job.dependencies
        # This is so we get the build task etc in our dependencies to have better beetmover
        # support.  But for multi-locale MSIX packages, we don't want the signing task to directly
        # depend on the langpack tasks.
        dependencies.update({
            k: v
            for k, v in signing_dependencies.items()
            if k != "docker-image"
            and not k.startswith("shippable-l10n-signing-linux64")
        })

        description = (
            "Signing of repackaged artifacts for locale '{locale}' for build '"
            "{build_platform}/{build_type}'".format(
                locale=attributes.get("locale", "en-US"),
                build_platform=attributes.get("build_platform"),
                build_type=attributes.get("build_type"),
            )
        )

        build_platform = dep_job.attributes.get("build_platform")
        is_shippable = dep_job.attributes.get("shippable")
        signing_type = get_signing_type_per_platform(
            build_platform, is_shippable, config
        )

        upstream_artifacts = []
        for artifact in sorted(dep_job.attributes.get("release_artifacts")):
            basename = os.path.basename(artifact)
            if basename in SIGNING_FORMATS:
                artifact_entry = {
                    "taskId": {"task-reference": f"<{dep_kind}>"},
                    "taskType": "repackage",
                    "paths": [artifact],
                    "formats": SIGNING_FORMATS[basename],
                }
                if basename == "target.installer.msi":
                    msi_display_name = dep_job.attributes.get(
                        "msi_display_name", "Firefox"
                    )
                    artifact_entry["authenticode_comment"] = (
                        f"{msi_display_name} Installer"
                    )
                upstream_artifacts.append(artifact_entry)

        task = {
            "label": label,
            "description": description,
            "worker-type": "linux-signing" if is_shippable else "linux-depsigning",
            "worker": {
                "implementation": "scriptworker-signing",
                "signing-type": signing_type,
                "upstream-artifacts": upstream_artifacts,
            },
            "dependencies": dependencies,
            "attributes": attributes,
            "run-on-repo-type": job.get("run-on-repo-type", ["git", "hg"]),
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "optimization": dep_job.optimization,
            "treeherder": treeherder,
        }

        yield task
