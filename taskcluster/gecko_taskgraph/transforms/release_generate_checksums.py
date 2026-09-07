# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the checksums task into an actual task description.
"""

import logging

from taskgraph.transforms.base import TransformSequence

from gecko_taskgraph.util.scriptworker import get_release_config

logger = logging.getLogger(__name__)

transforms = TransformSequence()


@transforms.add
def interpolate(config, jobs):
    release_config = get_release_config(config)
    for job in jobs:
        mh_options = list(job["run"]["options"])
        job["run"]["options"] = [
            option.format(
                version=release_config["version"],
                build_number=release_config["build_number"],
            )
            for option in mh_options
        ]
        yield job
