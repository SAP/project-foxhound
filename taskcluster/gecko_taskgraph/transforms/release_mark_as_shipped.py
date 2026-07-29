# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence

from gecko_taskgraph.util.scriptworker import get_release_config

transforms = TransformSequence()


@transforms.add
def make_task_description(config, jobs):
    release_config = get_release_config(config)
    for job in jobs:
        job["worker"]["release-name"] = (
            "{product}-{version}-build{build_number}".format(
                product=job["shipping-product"].capitalize(),
                version=release_config["version"],
                build_number=release_config["build_number"],
            )
        )

        yield job
