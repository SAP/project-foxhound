# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the openh264-symbol-upload task into an actual task description.
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.treeherder import inherit_treeherder_from_dep, join_symbol

from gecko_taskgraph.util.attributes import copy_attributes_from_dependent_job

transforms = TransformSequence()


@transforms.add
def make_symbol_upload_description(config, jobs):
    for job in jobs:
        dep_job = get_primary_dependency(config, job)
        assert dep_job

        build_platform = dep_job.attributes.get("build_platform")
        version = dep_job.attributes.get("openh264_version")
        if not version:
            raise Exception(f"openh264_version attribute missing from {dep_job.label}")

        symbol_secret = (
            "project/releng/gecko/build/level-{}/gecko-symbol-upload".format(
                config.params["level"]
            )
        )
        artifact_path = f"public/build/openh264-v{version}-{build_platform}.symbols.zip"

        dep_th = dep_job.task.get("extra", {}).get("treeherder", {})
        treeherder = inherit_treeherder_from_dep(job, dep_job)
        treeherder.setdefault(
            "symbol", join_symbol(dep_th.get("groupSymbol", "?"), "Sym")
        )

        task = {
            "label": job["label"],
            "description": f"Upload OpenH264 symbols for '{build_platform}'",
            "worker-type": "b-linux",
            "worker": {
                "docker-image": {"in-tree": "debian12-base"},
                "max-run-time": 1200,
                "env": {
                    "SYMBOL_SECRET": symbol_secret,
                },
            },
            "run": {
                "using": "mach",
                "mach": {
                    "artifact-reference": f"python toolkit/crashreporter/tools/upload_symbols.py <openh264/{artifact_path}>",
                },
                "sparse-profile": "upload-symbols",
            },
            "dependencies": {"openh264": dep_job.label},
            "attributes": copy_attributes_from_dependent_job(dep_job),
            "run-on-projects": dep_job.attributes.get("run_on_projects"),
            "run-on-repo-type": job.get("run-on-repo-type", ["hg"]),
            "scopes": [
                f"secrets:get:{symbol_secret}",
            ],
            "treeherder": treeherder,
        }

        yield task
