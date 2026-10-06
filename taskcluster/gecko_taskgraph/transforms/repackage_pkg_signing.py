# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import Schema
from taskgraph.util.treeherder import inherit_treeherder_from_dep

from gecko_taskgraph.transforms.task import TaskDescriptionSchema
from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job
from gecko_taskgraph.util.scriptworker import get_signing_type_per_platform


class RepackagePkgSigningSchema(Schema, kw_only=True):
    label: Optional[str] = None
    description: Optional[str] = None
    attributes: TaskDescriptionSchema.__annotations__["attributes"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    task_from: TaskDescriptionSchema.__annotations__["task_from"] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
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


transforms.add_validate(RepackagePkgSigningSchema)


@transforms.add
def make_task_description(config, tasks):
    for task in tasks:
        dep = get_primary_dependency(config, task)
        assert dep

        # Collect all dependencies from this group. For en-US builds there is
        # a single dependency; for l10n builds each locale in the chunk is a
        # separate upstream repackage-l10n task.
        all_deps = [
            config.kind_dependencies_tasks[label]
            for label in task.get("dependencies", {}).values()
            if label in config.kind_dependencies_tasks
        ]
        if not all_deps:
            all_deps = [dep]

        upstream_artifacts = []
        dependencies = {}
        for d in all_deps:
            dep_key = d.label if len(all_deps) > 1 else d.kind
            dependencies[dep_key] = d.label
            dependencies.update(d.dependencies)
            for artifact in d.attributes.get("release_artifacts", []):
                if artifact.endswith(".pkg"):
                    upstream_artifacts.append({
                        "taskId": {"task-reference": f"<{dep_key}>"},
                        "taskType": "repackage",
                        "paths": [artifact],
                        "formats": ["mac_single_file"],
                    })

        is_shippable = bool(dep.attributes.get("shippable"))

        th = inherit_treeherder_from_dep(task, dep)
        l10n_chunk = dep.attributes.get("l10n_chunk", "")
        th["symbol"] = f"pkg-Rpk(S{l10n_chunk})"

        # For chunked l10n tasks, override the label to use the chunk number
        # instead of the locale name that name_sanity generates.
        label = task["label"]
        if l10n_chunk:
            label = (
                f"{config.kind}-{dep.attributes['build_platform']}"
                f"-{l10n_chunk}/{dep.attributes['build_type']}"
            )

        attributes = copy_attributes_from_dependent_job(dep)
        if len(all_deps) > 1:
            attributes["chunk_locales"] = sorted(
                d.attributes["locale"] for d in all_deps if d.attributes.get("locale")
            )

        yield {
            "label": label,
            "description": f"MacOS pkg signing {l10n_chunk}".strip(),
            "worker-type": "mac-signing" if is_shippable else "mac-depsigning",
            "worker": {
                "signing-type": get_signing_type_per_platform(
                    dep.attributes.get("build_platform"), is_shippable, config
                ),
                "implementation": "iscript",
                "upstream-artifacts": upstream_artifacts,
                "mac-behavior": "mac_sign_pkg",
            },
            "dependencies": dependencies,
            "attributes": attributes,
            "run-on-projects": dep.attributes.get("run_on_projects"),
            "treeherder": th,
        }
