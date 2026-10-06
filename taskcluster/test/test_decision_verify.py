# Any copyright is dedicated to the public domain.
# http://creativecommons.org/publicdomain/zero/1.0/

import os

import gecko_taskgraph
import pytest
from gecko_taskgraph.util.verify import verifications
from mozunit import main
from taskgraph.generator import TaskGraphGenerator
from taskgraph.parameters import Parameters
from taskgraph.taskgraph import TaskGraph
from taskgraph.util.taskcluster import get_artifact


def pytest_generate_tests(metafunc):
    if "verification" in metafunc.fixturenames:
        name = metafunc.function.__name__.split("_", 1)[1]
        verification_objs = verifications._verifications.get(name, [])
        ids = [v.func.__name__ for v in verification_objs]
        metafunc.parametrize("verification", verification_objs, ids=ids)


@pytest.fixture(scope="module")
def parameters():
    if "TASK_GROUP_ID" not in os.environ:
        pytest.skip(reason="requires a Decision taskId to test against")

    return Parameters(
        **get_artifact(os.environ["TASK_GROUP_ID"], "public/parameters.yml")
    )


@pytest.fixture(scope="module")
def tgg(parameters):
    root = os.path.dirname(os.path.dirname(gecko_taskgraph.__file__))
    return TaskGraphGenerator(root, parameters)


@pytest.fixture(scope="module")
def graph_config(tgg):
    return tgg.graph_config


@pytest.fixture(scope="module")
def kinds(tgg):
    return {kind.name: kind for kind in tgg._load_kinds(tgg.graph_config, [])}


@pytest.fixture(scope="module")
def full_task_graph():
    if "TASK_GROUP_ID" not in os.environ:
        pytest.skip(reason="requires a Decision taskId to test against")

    return TaskGraph.from_json(
        get_artifact(os.environ["TASK_GROUP_ID"], "public/full-task-graph.json")
    )[1]


@pytest.fixture(scope="module")
def target_task_graph():
    if "TASK_GROUP_ID" not in os.environ:
        pytest.skip(reason="requires a Decision taskId to test against")

    return TaskGraph.from_json(
        get_artifact(os.environ["TASK_GROUP_ID"], "public/target-tasks.json")
    )[1]


@pytest.fixture(scope="module")
def morphed_task_graph():
    if "TASK_GROUP_ID" not in os.environ:
        pytest.skip(reason="requires a Decision taskId to test against")

    return TaskGraph.from_json(
        get_artifact(os.environ["TASK_GROUP_ID"], "public/task-graph.json")
    )[1]


def test_initial(verification):
    verification.verify()


def test_graph_config(verification, graph_config):
    verification.verify(graph_config)


def test_kinds(verification, kinds):
    verification.verify(kinds)


def test_parameters(verification, parameters):
    verification.verify(parameters)


def test_full_task_set(verification, full_task_graph, graph_config, parameters):
    # We don't write out the full_task_set as a decision task artifact, but
    # the full_task_graph is functionally equivalent.
    verification.verify(full_task_graph, graph_config, parameters)


def test_full_task_graph(verification, full_task_graph, graph_config, parameters):
    verification.verify(full_task_graph, graph_config, parameters)


def test_target_task_graph(verification, target_task_graph, graph_config, parameters):
    verification.verify(target_task_graph, graph_config, parameters)


def test_optimized_task_graph(
    verification, morphed_task_graph, graph_config, parameters
):
    # We don't write out the optimized graph as a decision task artifact, but
    # the morphed graph is a good enough stand-in.
    verification.verify(morphed_task_graph, graph_config, parameters)


def test_morphed_task_graph(verification, morphed_task_graph, graph_config, parameters):
    verification.verify(morphed_task_graph, graph_config, parameters)


if __name__ == "__main__":
    main()
