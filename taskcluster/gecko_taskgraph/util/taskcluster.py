# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import logging

import taskcluster_urls as liburls
from taskcluster import Hooks
from taskgraph.util import taskcluster as tc_util
from taskgraph.util.taskcluster import (
    get_root_url,
    get_task_definition,
    get_taskcluster_client,
)

logger = logging.getLogger(__name__)


def get_index_url(index_path, multiple=False, block_proxy=True):
    index_tmpl = liburls.api(
        get_root_url(block_proxy=block_proxy), "index", "v1", "task{}/{}"
    )
    return index_tmpl.format("s" if multiple else "", index_path)


def insert_index(index_path, task_id, data=None):
    # Find task expiry.
    expires = get_task_definition(task_id)["expires"]

    index = get_taskcluster_client("index")
    response = index.insertTask(
        index_path,
        {
            "taskId": task_id,
            "rank": 0,
            "data": data or {},
            "expires": expires,
        },
    )
    return response


def status_task(task_id):
    """Gets the status of a task given a task_id.

    In testing mode, just logs that it would have retrieved status.

    Args:
        task_id (str): A task id.

    Returns:
        dict: A dictionary object as defined here:
          https://docs.taskcluster.net/docs/reference/platform/queue/api#status
    """
    if tc_util.testing:
        logger.info(f"Would have gotten status for {task_id}.")
    else:
        queue = get_taskcluster_client("queue")
        response = queue.status(task_id)
        if response:
            return response.get("status", {})


def state_task(task_id):
    """Gets the state of a task given a task_id.

    In testing mode, just logs that it would have retrieved state. This is a subset of the
    data returned by :func:`status_task`.

    Args:
        task_id (str): A task id.

    Returns:
        str: The state of the task, one of
          ``pending, running, completed, failed, exception, unknown``.
    """
    if tc_util.testing:
        logger.info(f"Would have gotten state for {task_id}.")
    else:
        status = status_task(task_id).get("state") or "unknown"
        return status


def trigger_hook(hook_group_id, hook_id, hook_payload):
    hooks = Hooks({"rootUrl": get_root_url()})
    response = hooks.triggerHook(hook_group_id, hook_id, hook_payload)

    logger.info(
        "Task seen here: {}/tasks/{}".format(
            get_root_url(),
            response["status"]["taskId"],
        )
    )


def list_task_group_tasks(task_group_id):
    """Generate the tasks in a task group"""
    queue = get_taskcluster_client("queue")

    tasks = []

    def pagination_handler(response):
        tasks.extend(response["tasks"])

    queue.listTaskGroup(task_group_id, paginationHandler=pagination_handler)

    return tasks


def list_task_group_incomplete_task_ids(task_group_id):
    states = ("running", "pending", "unscheduled")
    for task in [t["status"] for t in list_task_group_tasks(task_group_id)]:
        if task["state"] in states:
            yield task["taskId"]


def list_task_group_complete_tasks(task_group_id):
    tasks = {}
    for task in list_task_group_tasks(task_group_id):
        if task.get("status", {}).get("state", "") == "completed":
            tasks[task.get("task", {}).get("metadata", {}).get("name", "")] = task.get(
                "status", {}
            ).get("taskId", "")
    return tasks


def find_task(index_path):
    index = get_taskcluster_client("index")
    return index.findTask(index_path)
