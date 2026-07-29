# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Support for running hazard jobs via dedicated scripts
"""

from typing import Literal, Optional, Union

from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.job import configure_taskdesc_for_run, run_job_using
from gecko_taskgraph.transforms.job.common import (
    add_tooltool,
    docker_worker_add_artifacts,
    setup_secrets,
)


class HazRunSchema(Schema, kw_only=True):
    using: Literal["hazard"]
    # The command to run within the task image (passed through to the worker)
    command: str
    # The mozconfig to use; default in the script is used if omitted
    mozconfig: Optional[str] = None
    # The set of secret names to which the task has access; these are prefixed
    # with `project/releng/gecko/{treeherder.kind}/level-{level}/`.   Setting
    # this will enable any worker features required and set the task's scopes
    # appropriately.  `true` here means ['*'], all secrets.  Not supported on
    # Windows
    secrets: Optional[Union[bool, list[str]]] = None
    # Base work directory used to set up the task.
    workdir: Optional[str] = None


@run_job_using("docker-worker", "hazard", schema=HazRunSchema)
def docker_worker_hazard(config, job, taskdesc):
    run = job["run"]

    worker = taskdesc["worker"] = job["worker"]
    worker.setdefault("artifacts", [])

    docker_worker_add_artifacts(config, job, taskdesc)
    worker.setdefault("required-volumes", []).append(
        "{workdir}/workspace".format(**run)
    )
    add_tooltool(config, job, taskdesc)
    setup_secrets(config, job, taskdesc)

    env = worker["env"]
    env.update({
        "MOZ_BUILD_DATE": config.params["moz_build_date"],
        "MOZ_SCM_LEVEL": config.params["level"],
    })

    # script parameters
    if run.get("mozconfig"):
        env["MOZCONFIG"] = run.pop("mozconfig")

    run["using"] = "run-task"
    run["cwd"] = run["workdir"]
    configure_taskdesc_for_run(config, job, taskdesc, worker["implementation"])
