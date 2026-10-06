# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
This transform constructs tasks generate conditioned profiles from
the condprof/kind.yml file
"""

from typing import Optional

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.copy import deepcopy
from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.job import JobDescriptionSchema
from gecko_taskgraph.transforms.task import TaskDescriptionSchema


class DiffDescriptionSchema(Schema, kw_only=True):
    # default is settled, but add 'full' to get both
    scenarios: Optional[list[str]] = None
    description: TaskDescriptionSchema.__annotations__["description"] = None
    dependencies: TaskDescriptionSchema.__annotations__["dependencies"] = None
    fetches: JobDescriptionSchema.__annotations__["fetches"] = None
    index: TaskDescriptionSchema.__annotations__["index"] = None
    task_from: Optional[str] = None
    name: Optional[str] = None
    run: JobDescriptionSchema.__annotations__["run"] = None
    run_on_projects: TaskDescriptionSchema.__annotations__["run_on_projects"] = None
    run_on_repo_type: TaskDescriptionSchema.__annotations__["run_on_repo_type"] = None
    scopes: TaskDescriptionSchema.__annotations__["scopes"] = None
    treeherder: TaskDescriptionSchema.__annotations__["treeherder"] = None
    use_python: JobDescriptionSchema.__annotations__["use_python"] = None
    worker: JobDescriptionSchema.__annotations__["worker"] = None
    worker_type: TaskDescriptionSchema.__annotations__["worker_type"] = None


transforms = TransformSequence()
transforms.add_validate(DiffDescriptionSchema)


@transforms.add
def generate_scenarios(config, tasks):
    for task in tasks:
        cmds = task["run"]["command"]
        symbol = task["treeherder"]["symbol"].split(")")[0]
        index = task["index"]
        jobname = index["job-name"]
        label = task["name"]
        run_as_root = task["run"].get("run-as-root", False)

        for scenario in set(task["scenarios"]):
            extra_args = ""
            if scenario == "settled":
                extra_args = " --force-new "

            tcmd = cmds.replace("${EXTRA_ARGS}", extra_args)
            tcmd = tcmd.replace("${SCENARIO}", scenario)

            index["job-name"] = "%s-%s" % (jobname, scenario)

            taskdesc = {
                "name": "%s-%s" % (label, scenario),
                "description": task["description"],
                "treeherder": {
                    "symbol": "%s-%s)" % (symbol, scenario),
                    "platform": task["treeherder"]["platform"],
                    "kind": task["treeherder"]["kind"],
                    "tier": task["treeherder"]["tier"],
                },
                "worker-type": deepcopy(task["worker-type"]),
                "worker": deepcopy(task["worker"]),
                "index": deepcopy(index),
                "run": {
                    "using": "run-task",
                    "cwd": task["run"]["cwd"],
                    "checkout": task["run"]["checkout"],
                    "tooltool-downloads": deepcopy(task["run"]["tooltool-downloads"]),
                    "command": tcmd,
                    "run-as-root": run_as_root,
                },
                "run-on-projects": deepcopy(task["run-on-projects"]),
                "run-on-repo-type": task.get("run-on-repo-type", ["git", "hg"]),
                "scopes": deepcopy(task["scopes"]),
                "dependencies": deepcopy(task["dependencies"]),
                "fetches": deepcopy(task["fetches"]),
            }

            use_taskcluster_python = task.get("use-python", "system")
            if use_taskcluster_python != "system":
                taskdesc["use-python"] = use_taskcluster_python

            yield taskdesc
