# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence

transforms = TransformSequence()


@transforms.add
def make_task_description(config, jobs):
    merge_config = config.params.get("merge_config", {})
    merge_automation_id = merge_config.get("merge-automation-id")

    if not merge_automation_id:
        return

    for job in jobs:
        job["worker"]["merge-automation-id"] = merge_automation_id

        yield job
