# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Support for running mach python-test tasks (via run-task)
"""

from typing import Literal, Optional, Union

from taskgraph.util.schema import Schema

from gecko_taskgraph.transforms.job import configure_taskdesc_for_run, run_job_using


class PythonTestSchema(Schema, kw_only=True):
    using: Literal["python-test"]
    # The subsuite to run
    subsuite: str
    # Base work directory used to set up the task.
    workdir: Optional[str] = None
    # Use the specified caches.
    use_caches: Optional[Union[bool, list[str]]] = None
    # Prepend the specified ENV variables to the command. This can be useful
    # if the value of the ENV needs to be interpolated with another ENV.
    prepend_env: Optional[dict[str, str]] = None


defaults = {
    "subsuite": "default",
}


@run_job_using(
    "docker-worker", "python-test", schema=PythonTestSchema, defaults=defaults
)
@run_job_using(
    "generic-worker", "python-test", schema=PythonTestSchema, defaults=defaults
)
def configure_python_test(config, job, taskdesc):
    run = job["run"]
    worker = job["worker"]

    # defer to the mach implementation
    run["mach"] = ("python-test --subsuite {subsuite} --run-slow").format(**run)
    run["using"] = "mach"
    del run["subsuite"]
    configure_taskdesc_for_run(config, job, taskdesc, worker["implementation"])
