# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
"""
Support for running mach tasks (via run-task)
"""

from typing import Literal, Optional, Union

from taskgraph.util.schema import Schema, taskref_or_string_msgspec

from gecko_taskgraph.transforms.job import configure_taskdesc_for_run, run_job_using


class MachSchema(Schema, kw_only=True):
    using: Literal["mach"]
    # The mach command (omitting `./mach`) to run
    mach: taskref_or_string_msgspec
    # The sparse checkout profile to use. Value is the filename relative to the
    # directory where sparse profiles are defined (build/sparse-profiles/).
    sparse_profile: Optional[str] = None
    # if true, perform a checkout of a comm-central based branch inside the
    # gecko checkout
    comm_checkout: bool
    # Prepend the specified ENV variables to the command. This can be useful
    # if the value of the ENV needs to be interpolated with another ENV.
    prepend_env: Optional[dict[str, str]] = None
    # Base work directory used to set up the task.
    workdir: Optional[str] = None
    # Use the specified caches.
    use_caches: Optional[Union[bool, list[str]]] = None


defaults = {
    "comm-checkout": False,
}


@run_job_using("docker-worker", "mach", schema=MachSchema, defaults=defaults)
@run_job_using("generic-worker", "mach", schema=MachSchema, defaults=defaults)
def configure_mach(config, job, taskdesc):
    run = job["run"]
    worker = job["worker"]

    additional_prefix = []
    if worker["os"] == "macosx":
        additional_prefix = ["LC_ALL=en_US.UTF-8", "LANG=en_US.UTF-8"]

    if prepend_env := run.pop("prepend-env", None):
        for name, value in prepend_env.items():
            additional_prefix.append(f"{name}={value}")

    command_prefix = " ".join(additional_prefix + ["./mach "])

    mach = run["mach"]
    if isinstance(mach, dict):
        ref, pattern = next(iter(mach.items()))
        command = {ref: command_prefix + pattern}
    else:
        command = command_prefix + mach

    # defer to the run_task implementation
    run["command"] = command
    run["cwd"] = "{checkout}"
    run["using"] = "run-task"
    del run["mach"]
    configure_taskdesc_for_run(config, job, taskdesc, job["worker"]["implementation"])
