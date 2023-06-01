# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Transform the repackage task into an actual task description.
"""


from taskgraph.transforms.base import TransformSequence

from gecko_taskgraph.util.copy_task import copy_task

transforms = TransformSequence()


@transforms.add
def split_locales(config, jobs):
    for job in jobs:
        dep_job = job["primary-dependency"]
        for locale in dep_job.attributes.get("chunk_locales", []):
            locale_job = copy_task(job)  # don't overwrite dict values here
            treeherder = locale_job.setdefault("treeherder", {})
            treeherder["symbol"] = f"L10n-Rpk({locale})"
            locale_job["locale"] = locale
            yield locale_job
