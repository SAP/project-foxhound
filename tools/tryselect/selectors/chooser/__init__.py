# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import multiprocessing
import os
import time
import webbrowser
from dataclasses import dataclass
from threading import Timer

from gecko_taskgraph.target_tasks import filter_by_uncommon_try_tasks

from tryselect.cli import BaseTryParser
from tryselect.push import (
    check_working_directory,
    generate_try_task_config,
    push_to_try,
)
from tryselect.tasks import generate_tasks

here = os.path.abspath(os.path.dirname(__file__))


@dataclass
class ChooserConfig:
    use_artifact: bool = False
    pernosco_active: bool = False
    rebuild_multiplier: int = 1
    priority_preset: bool = False


class ChooserParser(BaseTryParser):
    name = "chooser"
    arguments = []
    common_groups = ["push", "task"]
    task_configs = [
        "artifact",
        "browsertime",
        "chemspill-prio",
        "disable-pgo",
        "env",
        "existing-tasks",
        "gecko-profile",
        "path",
        "pernosco",
        "rebuild",
        "worker-overrides",
    ]


def run(
    metrics,
    update=False,
    query=None,
    try_config_params=None,
    full=False,
    parameters=None,
    save=False,
    preset=None,
    mod_presets=False,
    stage_changes=False,
    dry_run=False,
    message="{msg}",
    closed_tree=False,
    push_to_vcs=False,
):
    from .app import create_application

    push = not stage_changes and not dry_run
    check_working_directory(push)

    metrics.mach_try.taskgraph_generation_duration.start()
    tg = generate_tasks(parameters, full)
    metrics.mach_try.taskgraph_generation_duration.stop()

    metrics.mach_try.task_filtering_duration.start()
    # Remove tasks that are not to be shown unless `--full` is specified.
    if not full:
        excluded_tasks = [
            label
            for label in tg.tasks.keys()
            if not filter_by_uncommon_try_tasks(label)
        ]
        for task in excluded_tasks:
            tg.tasks.pop(task)

    metrics.mach_try.task_filtering_duration.stop()

    queue = multiprocessing.Queue()

    try_config_params = try_config_params or {}
    try_task_config = try_config_params.setdefault("try_task_config", {})
    rebuild_multiplier, priority_preset = resolve_large_push_context(try_task_config)
    config = ChooserConfig(
        use_artifact=bool(try_task_config.get("use-artifact-builds")),
        pernosco_active=bool(try_task_config.get("pernosco")),
        rebuild_multiplier=rebuild_multiplier,
        priority_preset=priority_preset,
    )

    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        # we are in the reloader process, don't open the browser or do any try stuff
        app = create_application(tg, queue, config)
        app.run()
        return

    # give app a second to start before opening the browser
    url = "http://127.0.0.1:5000"
    Timer(1, lambda: webbrowser.open(url)).start()
    print(f"Starting trychooser on {url}")
    process = multiprocessing.Process(
        target=create_and_run_application,
        args=(tg, queue, config),
    )
    process.start()

    metrics.mach_try.interactive_duration.start()
    result = queue.get()
    metrics.mach_try.interactive_duration.stop()

    # Allow the close page to render before terminating the process.
    time.sleep(1)
    process.terminate()

    selected = result["tasks"]
    use_artifact = result["use_artifact"]
    if not selected:
        print("no tasks selected")
        return

    resolve_artifact_state(try_task_config, config.use_artifact, use_artifact)

    msg = f"Try Chooser Enhanced ({len(selected)} tasks selected)"
    return push_to_try(
        "chooser",
        message.format(msg=msg),
        metrics,
        try_task_config=generate_try_task_config(
            "chooser", selected, params=try_config_params
        ),
        stage_changes=stage_changes,
        dry_run=dry_run,
        closed_tree=closed_tree,
        push_to_vcs=push_to_vcs,
    )


def resolve_large_push_context(try_task_config):
    """Match push.generate_try_task_config's math for the chooser warning.

    Returns (rebuild_multiplier, priority_preset). rebuild_multiplier is the
    per-label rebuild count, defaulting to 1 when ``rebuild`` is absent,
    mirroring push.py. priority_preset is True when an explicit priority was
    passed in, since push.py skips the deprioritization prompt in that case.
    """
    rebuild_multiplier = try_task_config.get("rebuild", 1)
    priority_preset = "priority" in try_task_config
    return rebuild_multiplier, priority_preset


def resolve_artifact_state(try_task_config, initial_use_artifact, use_artifact):
    if use_artifact:
        try_task_config["use-artifact-builds"] = True
        try_task_config["disable-pgo"] = True
        return

    try_task_config.pop("use-artifact-builds", None)
    # --artifact (task_config.Artifact) sets disable-pgo as a consequence
    # of enabling artifact builds. If we entered the chooser with artifact
    # on and the user toggled it off, clear disable-pgo too. An explicit
    # --disable-pgo run leaves initial_use_artifact=False and is preserved.
    if initial_use_artifact:
        try_task_config.pop("disable-pgo", None)


def create_and_run_application(tg, queue: multiprocessing.Queue, config=None):
    from .app import create_application

    app = create_application(tg, queue, config)
    app.run()
