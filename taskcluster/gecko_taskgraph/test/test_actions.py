# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import pytest
import yaml
from mozunit import main
from pytest_taskgraph import make_graph, make_task
from taskgraph import create
from taskgraph.util import json
from taskgraph.util.taskcluster import _task_definitions_cache

from gecko_taskgraph import decision
from gecko_taskgraph.actions import trigger_action_callback

ROOT_URL = "https://taskcluster.example.com"


@pytest.fixture(autouse=True)
def mock_root_url(monkeypatch):
    monkeypatch.delenv("TASKCLUSTER_PROXY_URL", raising=False)
    monkeypatch.setenv("TASKCLUSTER_ROOT_URL", ROOT_URL)


@pytest.fixture(autouse=True)
def clear_caches():
    yield
    _task_definitions_cache.cache.clear()


@pytest.fixture
def artifact_dir(monkeypatch, tmp_path):
    artifact_dir = tmp_path / "artifacts"
    monkeypatch.setattr(decision, "ARTIFACTS_DIR", str(artifact_dir))
    return artifact_dir


@pytest.fixture
def get_artifact(artifact_dir):
    def inner(artifact_name):
        return json.loads((artifact_dir / artifact_name).read_text())

    return inner


@pytest.fixture
def run_action(mocker, monkeypatch, parameters, graph_config):
    monkeypatch.setattr(create, "testing", True)
    mocker.patch("gecko_taskgraph.actions.registry.sanity_check_task_scope")

    def inner(name, params=None, **kwargs):
        if params:
            parameters.update(params)

        kwargs.setdefault("task_group_id", "gid")
        kwargs.setdefault("task_id", "tid")
        kwargs.setdefault("input", None)
        ret = trigger_action_callback(
            callback=name,
            parameters=parameters,
            root=graph_config.root_dir,
            **kwargs,
        )
        return ret

    return inner


def test_cancel(responses, run_action):
    task_id = "abc"

    responses.post(f"{ROOT_URL}/api/queue/v1/task/{task_id}/cancel", status=200)

    run_action("cancel", task_id=task_id, input={"task_id": task_id})


def test_cancel_all(monkeypatch, responses, run_action):
    group_id = "abc"

    # Validate action task doesn't cancel itself.
    monkeypatch.setenv("TASK_ID", group_id)

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task-group/{group_id}/list",
        status=200,
        json={
            "tasks": [
                {"status": {"taskId": group_id, "state": "running"}},
                {"status": {"taskId": "a", "state": "running"}},
                {"status": {"taskId": "b", "state": "completed"}},
                {"status": {"taskId": "c", "state": "pending"}},
                {"status": {"taskId": "d", "state": "unscheduled"}},
            ]
        },
    )

    responses.post(f"{ROOT_URL}/api/queue/v1/task/a/cancel", status=200)
    responses.post(f"{ROOT_URL}/api/queue/v1/task/c/cancel", status=200)
    responses.post(f"{ROOT_URL}/api/queue/v1/task/d/cancel", status=200)

    run_action(
        "cancel-all",
        task_group_id=group_id,
        input={"task_group_id": group_id},
    )


def test_rebuild_cached_tasks(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="foo", attributes={"cached_task": True}, task_def={"name": "foo"}
        ),
        make_task(label="bar", task_def={"name": "bar"}),
    )
    m = mocker.patch(
        "gecko_taskgraph.actions.rebuild_cached_tasks.fetch_graph_and_labels"
    )
    m.return_value = (
        "gid",
        graph,
        {label: "tid" for label in graph.tasks.keys()},
        None,
    )

    run_action("rebuild-cached-tasks")
    to_run = get_artifact("to-run.json")
    assert "foo" in to_run
    assert "bar" not in to_run


def test_add_new_jobs(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(label="foo", task_def={"name": "foo"}),
        make_task(label="bar", task_def={"name": "bar"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.add_new_jobs.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("add-new-jobs", input={"tasks": ["foo"], "times": 1})

    to_run = get_artifact("to-run.json")
    assert "foo" in to_run
    assert "bar" not in to_run


def test_add_talos(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="test-linux-talos",
            attributes={"talos_try_name": "talos"},
            task_def={"name": "test-linux-talos"},
        ),
        make_task(label="build", task_def={"name": "build"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.add_talos.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)
    mocker.patch("gecko_taskgraph.actions.add_talos.standard_filter", return_value=True)

    run_action("run-all-talos", input={"times": 1})

    to_run = get_artifact("to-run.json")
    assert "test-linux-talos" in to_run
    assert "build" not in to_run


def test_purge_caches(responses, run_action):
    task_id = "abc"
    task_def = {
        "payload": {"cache": {"cache1": "path1"}},
        "provisionerId": "proj-gecko",
        "workerType": "linux",
    }

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    responses.post(
        f"{ROOT_URL}/api/purge-cache/v1/purge-cache/proj-gecko%2Flinux",
        status=200,
        json={},
    )

    run_action("purge-cache", task_id=task_id)


def test_openh264(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="openh264-build", kind="openh264", task_def={"name": "openh264-build"}
        ),
        make_task(label="build", kind="build", task_def={"name": "build"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.openh264.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("openh264")

    to_run = get_artifact("to-run.json")
    assert "openh264-build" in to_run
    assert "build" not in to_run


def test_googleplay(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="push-fenix",
            kind="push-bundle",
            attributes={"build-type": "fenix-nightly"},
            task_def={"name": "push-fenix"},
        ),
        make_task(label="build", kind="build", task_def={"name": "build"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.googleplay.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("googleplay", params={"project": "mozilla-central"})

    to_run = get_artifact("to-run.json")
    assert "push-fenix" in to_run
    assert "build" not in to_run


def test_raptor_extra_options(mocker, responses, run_action, get_artifact):
    task_id = "tid"
    task_def = {
        "metadata": {"name": "test-raptor"},
        "payload": {"env": {}},
        "extra": {"treeherder": {"symbol": "rap", "groupName": "Raptor"}},
    }
    graph = make_graph(make_task(label="test-raptor", task_def=task_def))

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    m = mocker.patch(
        "gecko_taskgraph.actions.raptor_extra_options.fetch_graph_and_labels"
    )
    m.return_value = ("gid", graph, {"test-raptor": "tid"}, None)

    run_action(
        "raptor-extra-options", task_id=task_id, input={"extra_options": "verbose"}
    )

    to_run = get_artifact("to-run.json")
    assert "test-raptor" in to_run


def test_run_missing_tests(mocker, responses, run_action, get_artifact):
    graph = make_graph(
        make_task(label="test-foo", kind="test", task_def={"name": "test-foo"}),
        make_task(label="test-bar", kind="test", task_def={"name": "test-bar"}),
        make_task(label="build", kind="build", task_def={"name": "build"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.run_missing_tests.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {"test-foo": "tid1"}, None)

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/gid/artifacts/public%2Ftarget-tasks.json",
        status=303,
        json={"url": f"{ROOT_URL}/artifacts/target-tasks.json"},
    )
    responses.get(
        f"{ROOT_URL}/artifacts/target-tasks.json",
        status=200,
        json={"test-foo": {}, "test-bar": {}},
    )

    run_action("run-missing-tests")

    to_run = get_artifact("to-run.json")
    assert "test-bar" in to_run
    assert "test-foo" not in to_run
    assert "build" not in to_run


def test_scriptworker_canary(mocker, run_action, graph_config):
    m = mocker.patch("gecko_taskgraph.actions.scriptworker_canary.taskgraph_decision")

    run_action("scriptworker-canary", input={"scriptworkers": ["balrog", "shipit"]})

    m.assert_called_once()
    args, kwargs = m.call_args
    assert args[0] == {"root": graph_config.root_dir}
    assert kwargs["parameters"]["target_tasks_method"] == "scriptworker_canary"
    assert kwargs["parameters"]["try_task_config"] == {
        "scriptworker-canary-workers": ["balrog", "shipit"]
    }
    assert kwargs["parameters"]["tasks_for"] == "action"


def test_merge_automation(mocker, run_action, graph_config):
    m = mocker.patch("gecko_taskgraph.actions.merge_automation.taskgraph_decision")

    run_action(
        "merge-automation",
        params={"project": "mozilla-central"},
        input={"behavior": "bump-main", "merge-automation-id": 123},
    )

    m.assert_called_once()
    args, kwargs = m.call_args
    assert args[0] == {"root": graph_config.root_dir}
    assert kwargs["parameters"]["target_tasks_method"] == "merge_automation"
    assert kwargs["parameters"]["merge_config"] == {
        "force-dry-run": False,
        "behavior": "bump-main",
        "merge-automation-id": 123,
    }
    assert kwargs["parameters"]["tasks_for"] == "action"


def test_retrigger(mocker, responses, run_action, get_artifact):
    task_def = {
        "metadata": {"name": "test-task"},
        "payload": {},
    }
    graph = make_graph(
        make_task(label="test-task", attributes={"retrigger": True}, task_def=task_def)
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/tid",
        status=200,
        json=task_def,
    )
    m = mocker.patch("gecko_taskgraph.actions.retrigger.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("retrigger", input={"force": True})

    to_run = get_artifact("to-run.json")
    assert "test-task" in to_run


def test_retrigger_custom(mocker, responses, run_action, capsys):
    task_def = {
        "metadata": {"name": "test-mochitest"},
        "payload": {"command": ["run"], "env": {}},
        "tags": {"test-type": "mochitest"},
        "extra": {"treeherder": {"symbol": "M"}},
    }
    graph = make_graph(make_task(label="test-mochitest", task_def=task_def))

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/tid",
        status=200,
        json=task_def,
    )
    m = mocker.patch("gecko_taskgraph.actions.retrigger_custom.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {"test-mochitest": "dtid"}, None)

    run_action("retrigger-custom", input={"path": "test/path"})

    captured = capsys.readouterr()
    assert "test-mochitest" in captured.out
    assert "--no-run-tests" in captured.out
    assert "test/path" in captured.out
    assert "M-custom" in captured.out


def test_create_interactive(mocker, responses, monkeypatch, run_action, get_artifact):
    monkeypatch.setenv("TASK_ID", "action-task-id")
    task_def = {
        "metadata": {"name": "test-task"},
        "payload": {
            "env": {},
            "maxRunTime": 3600,
            "cache": {},
            "artifacts": {},
        },
        "scopes": [],
        "extra": {"treeherder": {"symbol": "T"}},
    }
    graph = make_graph(make_task(label="test-task", task_def=task_def))

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/tid",
        status=200,
        json=task_def,
    )
    m = mocker.patch(
        "gecko_taskgraph.actions.create_interactive.fetch_graph_and_labels"
    )
    m.return_value = ("gid", graph, {}, None)

    run_action("create-interactive", input={"notify": "test@example.com"})

    to_run = get_artifact("to-run.json")
    assert "test-task" in to_run


def test_backfill_task(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(label="test-task", task_def={"name": "test-task"}),
    )
    m = mocker.patch("gecko_taskgraph.actions.backfill.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)
    mocker.patch("gecko_taskgraph.actions.backfill.combine_task_graph_files")

    run_action(
        "backfill-task",
        input={"label": "test-task", "revision": "abc123", "symbol": "T"},
    )

    to_run = get_artifact("to-run-0.json")
    assert "test-task" in to_run


def test_confirm_failures(mocker, responses, run_action, get_artifact):
    task_id = "test-task-id"
    task_def = {
        "metadata": {"name": "test-mochitest"},
        "extra": {"suite": "mochitest"},
        "payload": {"command": ["run-tests"], "env": {}},
    }
    graph = make_graph(
        make_task(
            label="test-mochitest-cf",
            task_def={
                "name": "test-mochitest-cf",
                "payload": {"command": ["run-tests"], "env": {}},
                "metadata": {"name": "test-mochitest-cf"},
                "tags": {},
            },
        ),
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}/artifacts",
        status=200,
        json={
            "artifacts": [
                {"name": "public/logs/live_backing.log"},
                {"name": "public/logs/errorsummary.log"},
            ]
        },
    )

    errorsummary_content = b"\n".join([
        b'{"test": "dom/tests/test_example.html", "status": "FAIL", "expected": "PASS", "group": "dom/tests"}',
        b'{"test": "dom/tests/test_another.html", "status": "FAIL", "expected": "PASS", "group": "dom/tests"}',
    ])
    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}/artifacts/public%2Flogs%2Ferrorsummary.log",
        status=303,
        json={"url": f"{ROOT_URL}/artifacts/errorsummary.log"},
    )
    responses.get(
        f"{ROOT_URL}/artifacts/errorsummary.log",
        status=200,
        body=errorsummary_content,
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    m = mocker.patch("gecko_taskgraph.actions.confirm_failure.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("confirm-failures", task_id=task_id)

    to_run = get_artifact("to-run.json")
    assert "test-mochitest-cf" in to_run


def test_confirm_failures_retrigger(mocker, responses, run_action):
    task_id = "test-task-id"
    task_def = {
        "metadata": {"name": "test-mochitest"},
        "extra": {"suite": "mochitest"},
    }
    graph = make_graph(
        make_task(
            label="test-mochitest",
            attributes={"retrigger": True},
            task_def={"name": "test-mochitest"},
        ),
        make_task(label="test-mochitest-cf", task_def={"name": "test-mochitest-cf"}),
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}/artifacts",
        status=200,
        json={"artifacts": [{"name": "public/logs/live_backing.log"}]},
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    m = mocker.patch("gecko_taskgraph.actions.confirm_failure.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)
    retrigger_mock = mocker.patch(
        "gecko_taskgraph.actions.confirm_failure.retrigger_action"
    )

    run_action("confirm-failures", task_id=task_id)

    retrigger_mock.assert_called_once()


def test_rerun(mocker, responses, run_action):
    task_id = "tid"
    task_def = {"metadata": {"name": "test-task"}}

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}/status",
        status=200,
        json={"status": {"state": "failed"}},
    )
    responses.post(f"{ROOT_URL}/api/queue/v1/task/{task_id}/rerun", status=200)

    graph = make_graph(make_task(label="test-task", task_def=task_def))
    m = mocker.patch("gecko_taskgraph.actions.retrigger.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {"test-task": [task_id]}, {"test-task": [task_id]})

    run_action("rerun", task_id=task_id)


def test_retrigger_decision(responses, run_action, capsys):
    task_def = {
        "taskGroupId": "tgid",
        "schedulerId": "scheduler",
        "provisionerId": "provisioner",
        "workerType": "worker",
        "created": "2024-01-01T00:00:00.000Z",
        "deadline": "2024-01-01T01:00:00.000Z",
        "expires": "2024-01-02T00:00:00.000Z",
        "metadata": {"name": "decision-task"},
        "payload": {},
        "tags": {},
        "extra": {},
    }

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/tid",
        status=200,
        json=task_def,
    )

    run_action("retrigger-decision", params={"level": "1"})

    captured = capsys.readouterr()
    assert "decision-task" in captured.out
    assert "gecko-level-1" in captured.out
    assert "retrigger-decision-task" in captured.out


def test_retrigger_multiple(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="test-task",
            attributes={"retrigger": True},
            task_def={"name": "test-task"},
        ),
    )

    m = mocker.patch("gecko_taskgraph.actions.retrigger.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, {"test-task": ["tid"]})

    run_action(
        "retrigger-multiple",
        input={"requests": [{"tasks": ["test-task"], "times": 2}]},
    )

    to_run = get_artifact("to-run.json")
    assert "test-task" in to_run


def test_retrigger_multiple_rerun(mocker, responses, run_action):
    task_id = "rerun-task-id"
    graph = make_graph(
        make_task(
            label="test-task",
            attributes={"retrigger": False},
            task_def={"name": "test-task"},
        ),
    )

    m = mocker.patch("gecko_taskgraph.actions.retrigger.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, {"test-task": [task_id]})

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}/status",
        status=200,
        json={"status": {"state": "failed"}},
    )
    responses.post(f"{ROOT_URL}/api/queue/v1/task/{task_id}/rerun", status=200)

    run_action(
        "retrigger-multiple",
        input={"requests": [{"tasks": ["test-task"], "times": 2}]},
    )


def test_add_all_browsertime(mocker, run_action, get_artifact):
    graph = make_graph(
        make_task(
            label="raptor-browsertime",
            kind="test",
            attributes={
                "raptor_try_name": "browsertime-firefox",
                "test_platform": "linux64-shippable-qr/opt",
                "run_on_projects": ["mozilla-central"],
            },
            task_def={"name": "raptor-browsertime", "extra": {"suite": "raptor"}},
        ),
        make_task(label="build", kind="build", task_def={"name": "build"}),
    )

    m = mocker.patch("gecko_taskgraph.actions.backfill.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action("add-all-browsertime", params={"project": "mozilla-central"})

    to_run = get_artifact("to-run.json")
    assert "raptor-browsertime" in to_run
    assert "build" not in to_run


def test_gecko_profile(mocker, responses, run_action, get_artifact):
    task_id = "tid"
    task_def = {
        "metadata": {"name": "test-raptor"},
        "payload": {"command": [["run-tests"]], "env": {}},
        "extra": {
            "suite": "raptor",
            "treeherder": {"symbol": "R", "groupName": "Raptor"},
        },
    }
    graph = make_graph(
        make_task(
            label="test-raptor",
            kind="test",
            attributes={"unittest_suite": "raptor"},
            task_def={
                "name": "test-raptor",
                "payload": {"command": [["run-tests"]], "env": {}},
                "extra": {
                    "suite": "raptor",
                    "treeherder": {"symbol": "R", "groupName": "Raptor"},
                },
            },
        )
    )

    responses.get(
        "http://hg.example.com/json-pushes?version=2&startID=99&endID=100",
        status=200,
        json={"pushes": {"100": {"changesets": ["abc123"]}}},
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )

    responses.get(
        f"{ROOT_URL}/api/index/v1/task/gecko.v2.some-project.pushlog-id.100.decision/artifacts/public%2Fparameters.yml",
        status=303,
        headers={"Location": f"{ROOT_URL}/artifacts/gecko-profile-params.yml"},
    )
    responses.get(
        f"{ROOT_URL}/artifacts/gecko-profile-params.yml",
        status=200,
        body=yaml.dump({"pushlog_id": "100", "project": "autoland", "level": "1"}),
        content_type="application/x-yaml",
    )
    m = mocker.patch("gecko_taskgraph.actions.gecko_profile.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {"test-raptor": "tid"}, None)
    mocker.patch("gecko_taskgraph.actions.gecko_profile.combine_task_graph_files")

    run_action(
        "geckoprofile",
        task_id=task_id,
        params={"pushlog_id": "100", "head_repository": "http://hg.example.com"},
        input={"depth": 1, "gecko_profile_interval": 5},
    )

    to_run = get_artifact("to-run-100.json")
    assert "test-raptor" in to_run


def test_side_by_side(mocker, responses, run_action, get_artifact):
    task_id = "tid"
    task_def = {
        "metadata": {"name": "linux/opt-browsertime-tp6"},
        "extra": {"treeherder": {"symbol": "tp6"}},
        "payload": {"command": [["run"], ["perf-test {test_name}"]]},
    }
    graph = make_graph(
        make_task(
            label="perftest-linux-side-by-side",
            task_def={
                "name": "perftest-linux-side-by-side",
                "payload": {"command": [["run"], ["perf-test {test_name}"]]},
                "extra": {"treeherder": {"symbol": "sxs"}},
                "metadata": {"name": "perftest-linux-side-by-side"},
            },
        )
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/{task_id}",
        status=200,
        json=task_def,
    )
    m = mocker.patch("gecko_taskgraph.actions.side_by_side.fetch_graph_and_labels")
    m.return_value = ("gid", graph, {}, None)

    run_action(
        "side-by-side",
        task_id=task_id,
        params={"head_rev": "newrev123", "pushlog_id": "100"},
        input={"revision": "baserev456", "project": "autoland"},
    )

    to_run = get_artifact("to-run.json")
    assert "perftest-linux-side-by-side" in to_run


def test_release_promotion(
    mocker, monkeypatch, responses, run_action, parameters, graph_config
):
    m = mocker.patch("gecko_taskgraph.actions.release_promotion.taskgraph_decision")

    action_task_id = "action-task-id"
    monkeypatch.setenv("TASK_ID", action_task_id)

    responses.get(
        f"{ROOT_URL}/api/index/v1/task/gecko.v2.try.revision.abcdef.taskgraph.decision",
        status=200,
        json={"taskId": "decision-task-id"},
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/decision-task-id/artifacts/public%2Fparameters.yml",
        status=303,
        json={"url": f"{ROOT_URL}/artifacts/decision-parameters.yml"},
    )
    responses.get(
        f"{ROOT_URL}/artifacts/decision-parameters.yml",
        status=200,
        body=yaml.dump({
            "base_repository": "http://hg.example.com",
            "head_repository": "http://hg.example.com",
            "head_rev": "abcdef",
            "project": "try",
            "level": "1",
            "pushlog_id": "100",
            "required_signoffs": [],
            "signoff_urls": {},
            "release_product": "firefox",
            "release_type": "nightly",
        }),
        content_type="application/x-yaml",
    )
    responses.get(
        f"{ROOT_URL}/api/queue/v1/task/decision-task-id/artifacts/public%2Ffull-task-graph.json",
        status=303,
        json={"url": f"{ROOT_URL}/artifacts/full-task-graph.json"},
    )
    responses.get(
        f"{ROOT_URL}/artifacts/full-task-graph.json",
        status=200,
        json={},
    )

    responses.get(
        f"{ROOT_URL}/api/queue/v1/task-group/{action_task_id}/list",
        status=200,
        json={
            "tasks": [
                {"status": {"taskId": action_task_id, "state": "running"}},
            ]
        },
    )

    mocker.patch(
        "gecko_taskgraph.actions.release_promotion.find_existing_tasks_from_previous_kinds",
        return_value={},
    )

    run_action(
        "release-promotion",
        params={
            "project": "try",
            "level": "1",
        },
        input={
            "release_promotion_flavor": "promote_firefox",
            "build_number": 1,
            "version": "",
            "partial_updates": {},
            "release_enable_partner_repack": False,
            "release_enable_partner_attribution": False,
            "release_enable_emefree": False,
        },
    )

    m.assert_called_once()
    args, kwargs = m.call_args
    assert args[0] == {"root": graph_config.root_dir}
    assert kwargs["parameters"]["target_tasks_method"] == "promote_desktop"


if __name__ == "__main__":
    main()
