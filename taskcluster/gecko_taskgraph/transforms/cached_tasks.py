# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


from collections import deque

import taskgraph
from taskgraph.transforms.base import TransformSequence

from gecko_taskgraph.util.cached_tasks import add_optimization

transforms = TransformSequence()


def order_tasks(config, tasks):
    """Iterate image tasks in an order where parent tasks come first."""
    kind_prefix = config.kind + "-"

    pending = deque(tasks)
    task_labels = {task["label"] for task in pending}
    emitted = set()
    while pending:
        task = pending.popleft()
        parents = {
            task
            for task in task.get("dependencies", {}).values()
            if task in task_labels
            if task.startswith(kind_prefix)
        }
        if parents and not emitted.issuperset(parents):
            pending.append(task)
            continue
        emitted.add(task["label"])
        yield task


def format_task_digest(cached_task):
    return "/".join([
        cached_task["type"],
        cached_task["name"],
        cached_task["digest"],
    ])


@transforms.add
def cache_task(config, tasks):
    if taskgraph.fast:
        for task in tasks:
            yield task
        return

    digests = {}
    for task in config.kind_dependencies_tasks.values():
        if (
            "cached_task" in task.attributes
            and task.attributes["cached_task"] is not False
        ):
            digests[task.label] = format_task_digest(task.attributes["cached_task"])

    for task in order_tasks(config, tasks):
        cache = task.pop("cache", None)
        if cache is None:
            yield task
            continue

        dependency_digests = []
        for p in task.get("dependencies", {}).values():
            if p in digests:
                dependency_digests.append(digests[p])
            elif config.params["project"] == "toolchains":
                # The toolchains repository uses non-cached toolchain artifacts. Allow
                # tasks to use them.
                cache = None
                break
            else:
                raise Exception(
                    "Cached task {} has uncached parent task: {}".format(
                        task["label"], p
                    )
                )

        if cache is None:
            yield task
            continue

        digest_data = cache["digest-data"] + sorted(dependency_digests)
        # Ensure we don't re-use cached tasks across repo types, doing so
        # breaks some CoT verifications.
        if config.params["repository_type"] == "git":
            digest_data.append(config.params["repository_type"])

        add_optimization(
            config,
            task,
            cache_type=cache["type"],
            cache_name=cache["name"],
            digest_data=digest_data,
        )
        digests[task["label"]] = format_task_digest(task["attributes"]["cached_task"])

        yield task


@transforms.add
def bump_priority(config, tasks):
    """Bump priority of cached tasks on autoland from low to medium to avoid breakage for developers"""
    if config.params["project"] != "autoland":
        yield from tasks
        return

    for task in tasks:
        task.setdefault("priority", "medium")
        yield task
