# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.schema import resolve_keyed_by

from gecko_taskgraph.util.partners import build_macos_attribution_dmg_command

transforms = TransformSequence()
resolve_keyed_by_transforms = TransformSequence()


@resolve_keyed_by_transforms.add
def attribution_keyed_by(config, jobs):
    keyed_by_fields = (
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
def remove_attributes(config, jobs):
    """Remove attributes from parent task that aren't necessary."""
    for job in jobs:
        for attr in (
            "accepted-mar-channel-ids",
            "l10n_chunk",
            "mar-channel-id",
            "repackage_type",
            "required_signoffs",
            "shippable",
            "signed",
            "stub-installer",
            "update-channel",
        ):
            if attr in job["attributes"]:
                del job["attributes"][attr]
        yield job


@transforms.add
def stub_installer(config, jobs):
    """Not all windows builds come with a stub installer (only win32, and not
    on esr), so conditionally add it here based on our dependency's
    stub-installer attribute."""
    for job in jobs:
        dep_task = get_primary_dependency(config, job)
        assert dep_task

        if dep_task.attributes.get("stub-installer"):
            locale = job["attributes"].get("locale")
            if locale:
                artifact = f"{locale}/target.stub-installer.exe"
            else:
                artifact = "target.stub-installer.exe"

            job["fetches"][dep_task.kind].append(artifact)
            job["run"]["command"] += [
                "--input",
                "/builds/worker/fetches/target.stub-installer.exe",
            ]
            job["attributes"]["release_artifacts"].append(
                "public/build/target.stub-installer.exe"
            )
        yield job


@transforms.add
def set_treeherder(config, jobs):
    for job in jobs:
        th = job.setdefault("treeherder", {})
        attrs = job["attributes"]

        th["platform"] = f"{attrs['build_platform']}/{attrs['build_type']}"
        th["symbol"] = th["symbol"].format(**attrs)
        yield job


@transforms.add
def set_locale_label(config, jobs):
    for job in jobs:
        attrs = job["attributes"]
        if locale := attrs.get("locale"):
            platform, ship_type = attrs["build_platform"].rsplit("-", 1)
            job["label"] = (
                f"attribution-{platform}-{locale}-{ship_type}/{attrs['build_type']}"
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
                        "attribution": f"dlsource={dlsource}",
                    }
                ],
            )
            job["fetches"].setdefault("toolchain", []).append("linux64-libdmg")

        yield job
