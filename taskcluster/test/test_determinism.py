# Any copyright is dedicated to the public domain.
# http://creativecommons.org/publicdomain/zero/1.0/

import os

import pytest
from gecko_taskgraph import GECKO
from mozunit import main

pytestmark = pytest.mark.slow

PARAMS_DIR = os.path.join(GECKO, "taskcluster", "test", "params")


@pytest.mark.parametrize(
    "params_file",
    [
        "mc-to-beta-merge-automation",
        "mc-nightly-all",
        "mr-ship-firefox",
    ],
)
def test_full_task_graph_is_deterministic(create_tgg, params_file):
    params_path = os.path.join(PARAMS_DIR, f"{params_file}.yml")

    # generate the graph 3 times to increase the chances of catching non-determinism
    graphs = [
        create_tgg(parameters=params_path).full_task_graph.to_json() for _ in range(3)
    ]
    reference = graphs[0]

    for i, graph in enumerate(graphs[1:], start=2):
        assert sorted(reference) == sorted(graph), (
            f"Task sets differ on run {i} for params '{params_file}'"
        )
        for label in reference:
            assert reference[label] == graph[label], (
                f"Task '{label}' differs on run {i} for params '{params_file}'"
            )


if __name__ == "__main__":
    main()
