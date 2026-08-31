# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from taskgraph.util.task_context import custom_context

from gecko_taskgraph.util.attributes import release_level


@custom_context("release-level")
def release_level_context(config, task):
    return {"release-level": release_level(config.params)}
