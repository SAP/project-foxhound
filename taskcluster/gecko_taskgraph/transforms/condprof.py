# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
This transform constructs tasks generate conditioned profiles from
the condprof/kind.yml file
"""

from taskgraph.transforms.base import TransformSequence
from taskgraph.util.schema import Schema
from voluptuous import Optional

from gecko_taskgraph.transforms.job import job_description_schema
from gecko_taskgraph.transforms.task import task_description_schema
from gecko_taskgraph.util.copy_task import copy_task

diff_description_schema = Schema(
    {
        # default is settled, but add 'full' to get both
        Optional("scenarios"): [str],
        Optional("description"): task_description_schema["description"],
        Optional("dependencies"): task_description_schema["dependencies"],
        Optional("fetches"): job_description_schema["fetches"],
        Optional("index"): task_description_schema["index"],
        Optional("job-from"): str,
        Optional("name"): str,
        Optional("run"): job_description_schema["run"],
        Optional("run-on-projects"): task_description_schema["run-on-projects"],
        Optional("scopes"): task_description_schema["scopes"],
        Optional("treeherder"): task_description_schema["treeherder"],
        Optional("worker"): job_description_schema["worker"],
        Optional("worker-type"): task_description_schema["worker-type"],
    }
)

transforms = TransformSequence()
transforms.add_validate(diff_description_schema)


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
                "worker-type": copy_task(task["worker-type"]),
                "worker": copy_task(task["worker"]),
                "index": copy_task(index),
                "run": {
                    "using": "run-task",
                    "cwd": task["run"]["cwd"],
                    "checkout": task["run"]["checkout"],
                    "tooltool-downloads": copy_task(task["run"]["tooltool-downloads"]),
                    "command": tcmd,
                    "run-as-root": run_as_root,
                },
                "run-on-projects": copy_task(task["run-on-projects"]),
                "scopes": copy_task(task["scopes"]),
                "dependencies": copy_task(task["dependencies"]),
                "fetches": copy_task(task["fetches"]),
            }
            yield taskdesc
