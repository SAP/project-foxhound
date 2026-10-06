# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import logging

from taskgraph.transforms.base import TransformSequence

logger = logging.getLogger(__name__)


transforms = TransformSequence()


@transforms.add
def make_task_worker(config, jobs):
    for job in jobs:
        job["worker"]["product"] = job["shipping-product"]
        job["worker"]["version"] = config.params["version"]
        job["worker"]["channel"] = config.params["release_type"]
        yield job
