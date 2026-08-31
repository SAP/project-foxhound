# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Support for running spidermonkey jobs via dedicated scripts
"""

from typing import Literal, Optional, Union

from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.job import configure_taskdesc_for_run, run_job_using
from gecko_taskgraph.transforms.job.common import (
    docker_worker_add_artifacts,
    generic_worker_add_artifacts,
)


class SmRunSchema(Schema, kw_only=True):
    using: Literal["spidermonkey", "spidermonkey-package"]
    # SPIDERMONKEY_VARIANT and SPIDERMONKEY_PLATFORM
    spidermonkey_variant: str
    spidermonkey_platform: Optional[str] = None
    # Base work directory used to set up the task.
    workdir: Optional[str] = None
    tooltool_downloads: Union[bool, Literal["public", "internal"]]

    def __post_init__(self):
        if self.tooltool_downloads is True:
            raise ValueError(
                "tooltool-downloads must be False, 'public', or 'internal'"
            )


@run_job_using("docker-worker", "spidermonkey", schema=SmRunSchema)
@run_job_using("docker-worker", "spidermonkey-package", schema=SmRunSchema)
def docker_worker_spidermonkey(config, job, taskdesc):
    run = job["run"]

    worker = taskdesc["worker"] = job["worker"]
    worker.setdefault("artifacts", [])

    docker_worker_add_artifacts(config, job, taskdesc)

    env = worker.setdefault("env", {})
    env.update({
        "MOZHARNESS_DISABLE": "true",
        "SPIDERMONKEY_VARIANT": run.pop("spidermonkey-variant"),
        "MOZ_BUILD_DATE": config.params["moz_build_date"],
        "MOZ_SCM_LEVEL": config.params["level"],
    })
    if "spidermonkey-platform" in run:
        env["SPIDERMONKEY_PLATFORM"] = run.pop("spidermonkey-platform")

    script = "build-sm.sh"
    if run["using"] == "spidermonkey-package":
        script = "build-sm-package.sh"

    run["using"] = "run-task"
    run["cwd"] = run["workdir"]
    run["command"] = [f"./checkouts/gecko/taskcluster/scripts/builder/{script}"]

    configure_taskdesc_for_run(config, job, taskdesc, worker["implementation"])


@run_job_using("generic-worker", "spidermonkey", schema=SmRunSchema)
def generic_worker_spidermonkey(config, job, taskdesc):
    assert job["worker"]["os"] == "windows", "only supports windows right now"

    run = job["run"]

    worker = taskdesc["worker"] = job["worker"]

    generic_worker_add_artifacts(config, job, taskdesc)

    env = worker.setdefault("env", {})
    env.update({
        "MOZHARNESS_DISABLE": "true",
        "SPIDERMONKEY_VARIANT": run.pop("spidermonkey-variant"),
        "MOZ_BUILD_DATE": config.params["moz_build_date"],
        "MOZ_SCM_LEVEL": config.params["level"],
        "SCCACHE_DISABLE": "1",
        "WORK": ".",  # Override the defaults in build scripts
        "GECKO_PATH": "./src",  # with values suiteable for windows generic worker
        "UPLOAD_DIR": "./public/build",
    })
    if "spidermonkey-platform" in run:
        env["SPIDERMONKEY_PLATFORM"] = run.pop("spidermonkey-platform")

    script = "build-sm.sh"
    if run["using"] == "spidermonkey-package":
        script = "build-sm-package.sh"
        # Don't allow untested configurations yet
        raise Exception("spidermonkey-package is not a supported configuration")

    run["using"] = "run-task"
    run["command"] = [
        "c:\\mozilla-build\\msys2\\usr\\bin\\bash.exe "  # string concat
        '"./src/taskcluster/scripts/builder/%s"' % script
    ]

    configure_taskdesc_for_run(config, job, taskdesc, worker["implementation"])
