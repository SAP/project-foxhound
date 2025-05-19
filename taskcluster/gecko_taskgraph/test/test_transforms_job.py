# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

"""
Tests for the 'job' transform subsystem.
"""


import os
from copy import deepcopy

import pytest
from mozunit import main
from taskgraph.config import load_graph_config
from taskgraph.transforms.base import TransformConfig
from taskgraph.util.schema import Schema, validate_schema

from gecko_taskgraph import GECKO
from gecko_taskgraph.test.conftest import FakeParameters
from gecko_taskgraph.transforms import job
from gecko_taskgraph.transforms.job import run_task  # noqa: F401
from gecko_taskgraph.transforms.job.common import add_cache
from gecko_taskgraph.transforms.task import payload_builders

here = os.path.abspath(os.path.dirname(__file__))


TASK_DEFAULTS = {
    "description": "fake description",
    "label": "fake-task-label",
    "run": {
        "using": "run-task",
    },
}


@pytest.fixture(scope="module")
def config():
    graph_config = load_graph_config(os.path.join(GECKO, "taskcluster"))
    params = FakeParameters(
        {
            "base_repository": "http://hg.example.com",
            "head_repository": "http://hg.example.com",
            "head_rev": "abcdef",
            "level": 1,
            "project": "example",
        }
    )
    return TransformConfig(
        "job_test", here, {}, params, {}, graph_config, write_artifacts=False
    )


@pytest.fixture()
def transform(monkeypatch, config):
    """Run the job transforms on the specified task but return the inputs to
    `configure_taskdesc_for_run` without executing it.

    This gives test functions an easy way to generate the inputs required for
    many of the `run_using` subsystems.
    """

    def inner(task_input):
        task = deepcopy(TASK_DEFAULTS)
        task.update(task_input)
        frozen_args = []

        def _configure_taskdesc_for_run(*args):
            frozen_args.extend(args)

        monkeypatch.setattr(
            job, "configure_taskdesc_for_run", _configure_taskdesc_for_run
        )

        for _ in job.transforms(config, [task]):
            # This forces the generator to be evaluated
            pass

        return frozen_args

    return inner


@pytest.mark.parametrize(
    "task",
    [
        {"worker-type": "b-linux"},
        {"worker-type": "win11-64-2009-hw"},
    ],
    ids=lambda t: t["worker-type"],
)
def test_worker_caches(task, transform):
    config, job, taskdesc, impl = transform(task)
    add_cache(job, taskdesc, "cache1", "/cache1")
    add_cache(job, taskdesc, "cache2", "/cache2", skip_untrusted=True)

    if impl not in ("docker-worker", "generic-worker"):
        pytest.xfail(f"caches not implemented for '{impl}'")

    key = "caches" if impl == "docker-worker" else "mounts"
    assert key in taskdesc["worker"]
    assert len(taskdesc["worker"][key]) == 2

    # Create a new schema object with just the part relevant to caches.
    partial_schema = Schema(payload_builders[impl].schema.schema[key])
    validate_schema(partial_schema, taskdesc["worker"][key], "validation error")


if __name__ == "__main__":
    main()
