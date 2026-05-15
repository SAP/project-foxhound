# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the partials task into an actual task description.
"""

import json

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.dependencies import get_primary_dependency
from taskgraph.util.treeherder import inherit_treeherder_from_dep

from gecko_taskgraph.util.attributes import release_level
from gecko_taskgraph.util.partials import get_builds
from gecko_taskgraph.util.platforms import architecture
from gecko_taskgraph.util.scriptworker import (
    get_devedition_signing_type,
    get_signing_type,
)

transforms = TransformSequence()


def identify_desired_signing_keys(config):
    """
    Determine the signing certificate type to use for MAR validation.
    It identifies the appropriate signing type based on the release product
    and configuration parameters, handling special logic for devedition releases.

    Args:
        config: The task graph configuration object containing:
    Returns:
        str: The signing type (defined in util/scriptworker.py)
    """
    if config.params["release_product"] == "devedition":
        return get_devedition_signing_type(config=config)
    return get_signing_type(config=config)


@transforms.add
def make_task_description(config, tasks):
    # If no balrog release history, then don't generate partials
    if not config.params.get("release_history"):
        return
    for task in tasks:
        dep_task = get_primary_dependency(config, task)
        assert dep_task

        locale = task["attributes"].get("locale")
        build_locale = locale or "en-US"

        build_platform = task["attributes"]["build_platform"]
        builds = get_builds(
            config.params["release_history"], build_platform, build_locale
        )

        # If the list is empty there's no available history for this platform
        # and locale combination, so we can't build any partials.
        if not builds:
            continue

        mar_channel_id = task["attributes"]["mar-channel-id"]

        locale_suffix = ""
        if locale:
            locale_suffix = f"{locale}/"
        artifact_path = f"{locale_suffix}target.complete.mar"

        # Fetches from upstream repackage task
        task["fetches"][dep_task.kind] = [artifact_path]

        cert_type = identify_desired_signing_keys(config).replace("-signing", "")

        from_data = []
        update_number = 1
        for build in sorted(builds):
            partial_info = {
                "url": builds[build]["mar_url"],
                "update_number": update_number,
                "dest_mar": build,
            }
            if "previousVersion" in builds[build]:
                partial_info["previousVersion"] = builds[build]["previousVersion"]
            from_data.append(partial_info)
        from_mars_json = json.dumps(from_data, separators=(",", ":"))

        extra_params = [
            f"--arch={architecture(build_platform)}",
            f"--locale={build_locale}",
            f"--target=/builds/worker/artifacts/{locale_suffix}",
            f"--from-mars-json='{from_mars_json}'",
            f"--mar-channel-id='{mar_channel_id}'",
            f"--branch={config.params['project']}",
            f"--cert-path=/builds/worker/workspace/keys/{cert_type}.pubkey",
        ]

        if release_level(config.params) == "staging":
            extra_params.append("--allow-staging-urls")

        for artifact in dep_task.attributes["release_artifacts"]:
            if artifact.endswith(".complete.mar"):
                extra_params.append(f"--to-mar-url=<{dep_task.kind}/{artifact}>")
                break

        full_cmd = (
            task["run"]["command"]["artifact-reference"] + "\n" + " ".join(extra_params)
        )
        # remove all whitespace from the command
        full_cmd = " ".join([line.strip() for line in full_cmd.splitlines()])
        task["run"]["command"]["artifact-reference"] = full_cmd

        task["description"] = (
            f"Partials task for locale '{build_locale}' for build '{build_platform}'"
        )

        task["treeherder"] = inherit_treeherder_from_dep(task, dep_task)
        # TODO: Reset this to tier 1 once D272679 is landed
        task["treeherder"]["tier"] = 3
        task["treeherder"]["symbol"] = f"pz({locale or 'N'})"

        yield task
