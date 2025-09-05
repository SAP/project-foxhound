# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import resolve_keyed_by

from gecko_taskgraph.util.partners import build_macos_attribution_dmg_command

transforms = TransformSequence()
resolve_keyed_by_transforms = TransformSequence()


@resolve_keyed_by_transforms.add
def attribution_keyed_by(config, jobs):
    keyed_by_fields = (
        "fetches",
        "attributes.release_artifacts",
        "run.command",
        "properties-with-locale",  # properties-with-locale only exists in the l10n task
    )
    for job in jobs:
        build_platform = {"build-platform": job["attributes"]["build_platform"]}
        for field in keyed_by_fields:
            resolve_keyed_by(item=job, field=field, item_name=field, **build_platform)
        yield job


@transforms.add
def stub_installer(config, jobs):
    """Not all windows builds come with a stub installer (only win32, and not
    on esr), so conditionally add it here based on our dependency's
    stub-installer attribute."""
    for job in jobs:
        dep_name, dep_label = next(iter(job["dependencies"].items()))
        dep_task = config.kind_dependencies_tasks[dep_label]
        if dep_task.attributes.get("stub-installer"):
            locale = job["attributes"].get("locale")
            if locale:
                artifact = f"{locale}/target.stub-installer.exe"
            else:
                artifact = "target.stub-installer.exe"
            job["fetches"][dep_name].append(artifact)
            job["run"]["command"] += [
                "--input",
                "/builds/worker/fetches/target.stub-installer.exe",
            ]
            job["attributes"]["release_artifacts"].append(
                "public/build/target.stub-installer.exe"
            )
        yield job


@transforms.add
def mac_attribution(config, jobs):
    """Adds \t padding to the mac attribution data. Implicitly assumes that the
    attribution data is the last thing in job.run.command
    """
    for job in jobs:
        dlsource = job.pop("dlsource")
        if "macosx" in job["attributes"]["build_platform"]:
            job["run"]["command"] = build_macos_attribution_dmg_command(
                "/builds/worker/fetches/dmg/dmg",
                [
                    {
                        "input": "/builds/worker/fetches/target.dmg",
                        "output": "/builds/worker/artifacts/target.dmg",
                        "attribution": "dlsource={}".format(dlsource),
                    }
                ],
            )

        yield job
