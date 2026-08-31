# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.transforms.base import TransformSequence

transforms = TransformSequence()


@transforms.add
def set_openh264_version(config, jobs):
    fetch_task = config.kind_dependencies_tasks.get("fetch-openh264-source")
    if not fetch_task:
        raise Exception("fetch-openh264-source task not found in kind dependencies")
    version = fetch_task.attributes["openh264_version"]
    for job in jobs:
        job.setdefault("attributes", {})["openh264_version"] = version
        yield job
