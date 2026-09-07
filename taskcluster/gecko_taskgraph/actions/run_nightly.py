# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import os

from taskcluster.exceptions import TaskclusterRestFailure
from taskgraph.parameters import Parameters
from taskgraph.taskgraph import TaskGraph
from taskgraph.util.taskcluster import get_artifact, list_task_group_incomplete_tasks

from gecko_taskgraph.actions.registry import register_callback_action
from gecko_taskgraph.decision import taskgraph_decision
from gecko_taskgraph.util.partials import populate_release_history
from gecko_taskgraph.util.taskgraph import (
    find_decision_task,
    find_existing_tasks_from_previous_kinds,
)


@register_callback_action(
    name="nightly-build-tasks",
    title="Run Nightly Builds Tasks",
    symbol="nbt",
    description="Runs tasks associated with Nightly builds. Exists solely to make it possible to test Nightly-specific tasks and behaviours on Try, where it is not viable to run these things through cron hooks.",
    order=500,
    context=[],
    available=lambda params: params["project"] == "try",
    schema=lambda graph_config: {
        "type": "object",
        "properties": {
            "do_not_optimize": {
                "type": "array",
                "description": (
                    "Optional: a list of labels to avoid optimizing out "
                    "of the graph (to force a rerun of, say, "
                    "funsize docker-image tasks)."
                ),
                "items": {
                    "type": "string",
                },
            },
            "rebuild_kinds": {
                "type": "array",
                "description": (
                    "Optional: an array of kinds to ignore from the previous graph(s)."
                ),
                "default": graph_config["release-promotion"].get("rebuild-kinds", []),
                "items": {
                    "type": "string",
                },
            },
            "previous_graph_ids": {
                "type": "array",
                "description": (
                    "Optional: an array of taskIds of decision or action "
                    "tasks from the previous graph(s) to use to populate "
                    "our `previous_graph_kinds`."
                ),
                "items": {
                    "type": "string",
                },
            },
            "limit_product": {
                "type": "string",
                "description": "Limit the products being built",
                "enum": ["desktop", "android", ""],
                "default": "",
            },
            "limit_platform": {
                # ideally we'd take an array of strings. in practice this is
                # difficult because we can only set one target tasks method,
                # and none exist that support limiting by arbitrary platforms
                "type": "string",
                "description": "Limit the platforms being built",
                "enum": ["linux", "macosx", "win32", "win64", "win64_aarch64", ""],
                "default": "",
            },
        },
    },
)
def run_nightly_builds_action(
    push_parameters, graph_config, input, task_group_id, task_id
):
    rebuild_kinds = input.get("rebuild_kinds", [])
    do_not_optimize = input.get("do_not_optimize", [])

    # Make sure no pending tasks remain from a previous run
    own_task_id = os.environ.get("TASK_ID", "")
    try:
        for t in list_task_group_incomplete_tasks(own_task_id):
            if t == own_task_id:
                continue
            raise Exception(
                f"task group has unexpected pre-existing incomplete tasks (e.g. {t})"
            )
    except TaskclusterRestFailure as e:
        # 404 means the task group doesn't exist yet, and we're fine
        if e.status_code != 404:
            raise

    previous_graph_ids = input.get("previous_graph_ids")
    if not previous_graph_ids:
        previous_graph_ids = [find_decision_task(push_parameters, graph_config)]

    # Download parameters from the first decision task
    parameters = get_artifact(previous_graph_ids[0], "public/parameters.yml")
    # Override `head_rev` - this should always be the revision that this action
    # task was fired from. If the first `previous_graph_id` given was from an
    # earlier revision, it will end up being wrong. This will cause any created
    # tasks to have the wrong revision set, which causes problems such as showing
    # up in the wrong place on Treeherder, and associated cached task digests
    # with unmatched sources.
    parameters["head_rev"] = push_parameters["head_rev"]

    # Download and combine full task graphs from each of the previous_graph_ids.
    # Sometimes previous relpro action tasks will add tasks, like partials,
    # that didn't exist in the first full_task_graph, so combining them is
    # important. The rightmost graph should take precedence in the case of
    # conflicts.
    combined_full_task_graph = {}
    for graph_id in previous_graph_ids:
        full_task_graph = get_artifact(graph_id, "public/full-task-graph.json")
        combined_full_task_graph.update(full_task_graph)
    _, combined_full_task_graph = TaskGraph.from_json(combined_full_task_graph)
    parameters["existing_tasks"] = find_existing_tasks_from_previous_kinds(
        combined_full_task_graph, previous_graph_ids, rebuild_kinds
    )
    parameters["do_not_optimize"] = do_not_optimize
    # When doing staging releases on try, we still want to re-use tasks from
    # previous graphs.
    parameters["optimize_target_tasks"] = True

    limit_product = input.get("limit_product")
    if limit_product or limit_product == "desktop":
        parameters["release_history"] = populate_release_history(
            "Firefox", "mozilla-central"
        )
    # choose the right target tasks method
    if limit_product:
        if limit_product == "desktop":
            if limit_platform := input.get("limit_platform"):
                parameters["target_tasks_method"] = f"nightly_{limit_platform}"
            else:
                parameters["target_tasks_method"] = "nightly_desktop"
        elif limit_product == "android":
            parameters["target_tasks_method"] = "nightly-android"
    else:
        parameters["target_tasks_method"] = "nightly_all"

    parameters["dontbuild"] = False
    # make parameters read-only
    parameters = Parameters(**parameters)

    taskgraph_decision({"root": graph_config.root_dir}, parameters=parameters)
