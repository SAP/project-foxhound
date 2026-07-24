# Any copyright is dedicated to the Public Domain.
# https://creativecommons.org/publicdomain/zero/1.0/

import mozunit
from taskgraph.task import Task
from taskgraph.transforms import from_deps

from gecko_taskgraph.transforms import code_coverage


def test_add_dependencies_sets_if_dependencies(run_transform):
    task = {
        "label": "code-coverage-artifacts",
        "dependencies": {
            "a": "linux64-ccov/opt",
            "b": "linux64-ccov/debug",
        },
        "if-dependencies": [],
    }

    transformed = list(run_transform(code_coverage.add_dependencies, task))

    assert len(transformed) == 1
    assert transformed[0]["if-dependencies"] == [
        "linux64-ccov/opt",
        "linux64-ccov/debug",
    ]


def test_add_dependencies_drops_tasks_without_dependencies(run_transform):
    task = {
        "label": "code-coverage-artifacts",
        "dependencies": {},
        "if-dependencies": [],
    }

    transformed = list(run_transform(code_coverage.add_dependencies, task))

    assert transformed == []


def test_from_deps_and_code_coverage_integration(run_transform):
    ccov_1 = Task(
        kind="test",
        label="linux64-ccov-opt",
        attributes={"ccov": True},
        task={},
    )
    ccov_2 = Task(
        kind="test",
        label="linux64-ccov-debug",
        attributes={"ccov": True},
        task={},
    )
    non_ccov = Task(
        kind="test",
        label="linux64-opt",
        attributes={},
        task={},
    )
    kind_dependencies_tasks = {
        ccov_1.label: ccov_1,
        ccov_2.label: ccov_2,
        non_ccov.label: non_ccov,
    }

    task = {
        "label": "code-coverage-artifacts",
        "description": "Code coverage artifacts",
        "attributes": {},
        "from-deps": {
            "group-by": "all",
            "unique-kinds": False,
            "set-name": False,
            "with-attributes": {"ccov": [True]},
        },
    }

    with_deps = list(
        run_transform(
            from_deps.from_deps,
            task,
            kind_dependencies_tasks=kind_dependencies_tasks,
            config={"kind-dependencies": ["test"]},
        )
    )
    transformed = list(run_transform(code_coverage.add_dependencies, with_deps))

    assert len(transformed) == 1
    assert set(transformed[0]["dependencies"].values()) == {
        ccov_1.label,
        ccov_2.label,
    }
    assert transformed[0]["if-dependencies"] == list(
        transformed[0]["dependencies"].values()
    )


if __name__ == "__main__":
    mozunit.main()
