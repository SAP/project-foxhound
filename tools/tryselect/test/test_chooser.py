# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import multiprocessing
import re

import mozunit
import pytest
from tryselect.push import LARGE_PUSH_THRESHOLD
from tryselect.selectors.chooser import (
    ChooserConfig,
    resolve_artifact_state,
    resolve_large_push_context,
)
from tryselect.selectors.chooser.app import create_application

TASKS = [
    {
        "kind": "build",
        "label": "build-windows",
        "attributes": {
            "build_platform": "windows",
        },
    },
    {
        "kind": "test",
        "label": "test-windows-xpcshell-e10s",
        "attributes": {
            "unittest_suite": "xpcshell",
            "build_platform": "windows",
        },
    },
    {
        "kind": "mochitest",
        "label": "test-windows-mochitest-e10s",
        "attributes": {
            "unittest_suite": "mochitest-browser-chrome",
            "mochitest_try_name": "mochitest-browser-chrome",
            "build_platform": "windows",
        },
    },
]


@pytest.fixture
def queue():
    return multiprocessing.Queue()


@pytest.fixture
def app(tg, queue):
    app = create_application(tg, queue)
    app.config["TESTING"] = True

    ctx = app.app_context()
    ctx.push()
    yield app
    ctx.pop()


def test_try_chooser_renders_filters(app):
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200

    expected_output = [
        b"""<title>Try Chooser Enhanced</title>""",
        b"""<input class="filter" type="checkbox" id=windows name="build" value='{"build_platform": ["windows"]}' onchange="apply();">""",  # noqa
        b"""<input class="filter" type="checkbox" id=mochitest-browser-chrome name="test,mochitest,reftest,browsertime,web-platform-tests" value='{"unittest_suite": ["mochitest-browser-chrome"]}' onchange="apply();">""",  # noqa
        b"""<input class="filter" type="checkbox" id=xpcshell name="test,mochitest,reftest,browsertime,web-platform-tests" value='{"unittest_suite": ["xpcshell"]}' onchange="apply();">""",  # noqa
    ]

    for expected in expected_output:
        assert expected in response.data

    # Guard against debug leftovers creeping back into the checkbox onchange.
    assert b"console.log" not in response.data


def test_try_chooser_cross_section_narrowing_preconditions(app):
    # filter.js's cross-section narrowing pools checkbox filter values per
    # attribute and scopes them by that attribute's "namespace" — the set
    # of values any section renders as a checkbox option. For selecting
    # a Platform row to narrow Test rows, two structural facts must hold:
    #   1. Platform's checkbox values carry build_platform (contributing
    #      to the build_platform namespace).
    #   2. The tasks object serialized into the page carries build_platform
    #      on test tasks too, so the namespace has something to match.
    # If either breaks, selecting a platform silently stops constraining
    # tests, which is precisely the regression this guards against.
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200

    # A Platform checkbox must exist carrying build_platform=[windows].
    # Use lookaheads so attribute ordering on the <input> tag isn't part
    # of the contract — an unrelated template shuffle shouldn't look
    # like a cross-section narrowing regression.
    assert re.search(
        rb"<input\b(?=[^>]*\bname=\"build\")"
        rb"(?=[^>]*\bvalue='\{\"build_platform\": \[\"windows\"\]\}')",
        response.data,
    )
    # Test and mochitest task entries in the tasks global must include
    # build_platform so JS can narrow them by platform. Match on attribute
    # presence, not on JSON key order, so an unrelated attribute addition
    # can't masquerade as a regression.
    assert re.search(
        rb'"test-windows-xpcshell-e10s":\s*\{[^}]*"build_platform":\s*"windows"',
        response.data,
    )
    assert re.search(
        rb'"test-windows-mochitest-e10s":\s*\{[^}]*"build_platform":\s*"windows"',
        response.data,
    )


def test_try_chooser_buildtype_radio_is_scalar(app):
    # filter.js apply() compares task.build_type !== buildTypeFilter as
    # strings. The radio values must stay scalar JSON; moving them to
    # arrays (like section checkbox values) would silently break the
    # comparison without a corresponding filter.js change.
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    assert b"""value='{"build_type": "opt"}'""" in response.data
    assert b"""value='{"build_type": "debug"}'""" in response.data


def test_try_chooser_artifact_default_unchecked(app):
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200
    assert b'name="artifact" checked' not in response.data
    assert b'name="artifact"' in response.data


def test_try_chooser_exclude_filter_controls(app):
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200

    # Exclude-filter input should be present and wired to the debounced
    # handler so keystrokes don't trigger a full re-render each time. Scope
    # the handler assertion to the exclude-filter element itself; chunk
    # inputs share scheduleApplyFilters and would otherwise satisfy a bare
    # substring match.
    assert re.search(
        rb'<input[^>]*\bid="exclude-filter"[^>]*\boninput="scheduleApplyFilters\(\);"',
        response.data,
    )
    assert b'placeholder="Exclude jobs containing' in response.data
    assert b'aria-label="Exclude jobs containing"' in response.data
    # Don't persist filter text across sessions via browser autofill.
    assert b'autocomplete="off"' in response.data
    # Exclude-filter must sit outside the form so Enter can't submit it.
    assert response.data.index(b'id="exclude-filter"') < response.data.index(
        b'<form id="submit-tasks"'
    )


def test_try_chooser_selection_list_markup(app):
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200

    # Selection list + hidden form field that carries the chosen labels.
    assert b'<ul id="selection">' in response.data
    assert b'id="selected-tasks"' in response.data
    assert b'name="selected-tasks"' in response.data


def test_try_chooser_large_push_warning_defaults(app):
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200

    # Large-push warning is rendered hidden and references the actual threshold
    # that push.py uses to trigger the deprioritization prompt.
    assert b'id="large-push-warning"' in response.data
    # Polite live region so count updates don't spam assertive announcements.
    assert b'role="status"' in response.data
    assert b'aria-live="polite"' in response.data
    assert b'id="large-push-count"' in response.data
    assert f"over {LARGE_PUSH_THRESHOLD} tasks".encode() in response.data
    assert b"narrowing your selection" in response.data
    # Defaults match push.py when no rebuild/priority is set.
    assert b"const largePushMultiplier = 1;" in response.data
    assert b"const largePushSuppressed = false;" in response.data


def test_try_chooser_cancel(app, queue: multiprocessing.Queue):
    client = app.test_client()
    response = client.post("/", data={"action": "Cancel"})
    assert response.status_code == 200
    assert b"You may now close this page" in response.data
    assert queue.get() == {"tasks": [], "use_artifact": False}


def test_try_chooser_push_empty(app, queue: multiprocessing.Queue):
    client = app.test_client()
    response = client.post("/", data={"action": "Push", "selected-tasks": ""})
    assert response.status_code == 200
    assert b"You may now close this page" in response.data
    assert queue.get() == {"tasks": [], "use_artifact": False}


def test_try_chooser_push_selected_tasks(app, queue: multiprocessing.Queue):
    client = app.test_client()
    response = client.post(
        "/",
        data={
            "action": "Push",
            "selected-tasks": "build-windows\ntest-windows-mochitest-e10s",
        },
    )
    assert response.status_code == 200
    assert b"You may now close this page" in response.data
    result = queue.get()
    assert set(result["tasks"]) == {"build-windows", "test-windows-mochitest-e10s"}
    assert result["use_artifact"] is False


def test_try_chooser_artifact_initial_state(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(use_artifact=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200
    assert b'name="artifact" checked' in response.data


def test_try_chooser_cancel_ignores_initial_artifact(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(use_artifact=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.post("/", data={"action": "Cancel"})
    assert response.status_code == 200
    assert queue.get() == {"tasks": [], "use_artifact": False}


def test_try_chooser_artifact_toggle_on(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(use_artifact=False))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.post(
        "/",
        data={
            "action": "Push",
            "selected-tasks": "build-windows",
            "artifact": "on",
        },
    )
    assert response.status_code == 200
    assert queue.get() == {"tasks": ["build-windows"], "use_artifact": True}


def test_try_chooser_artifact_toggle_off(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(use_artifact=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.post(
        "/",
        data={
            "action": "Push",
            "selected-tasks": "build-windows",
        },
    )
    assert response.status_code == 200
    assert queue.get() == {"tasks": ["build-windows"], "use_artifact": False}


def test_try_chooser_large_push_rebuild_multiplier(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(rebuild_multiplier=3))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200
    assert b"const largePushMultiplier = 3;" in response.data


def test_try_chooser_large_push_suppressed_when_priority_preset(
    tg, queue: multiprocessing.Queue
):
    app = create_application(tg, queue, ChooserConfig(priority_preset=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200
    assert b"const largePushSuppressed = true;" in response.data


def test_try_chooser_large_push_multiplier_and_suppressed(
    tg, queue: multiprocessing.Queue
):
    app = create_application(
        tg, queue, ChooserConfig(rebuild_multiplier=5, priority_preset=True)
    )
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200
    assert b"const largePushMultiplier = 5;" in response.data
    assert b"const largePushSuppressed = true;" in response.data


def test_try_chooser_pernosco_hides_checkbox(tg, queue: multiprocessing.Queue):
    app = create_application(tg, queue, ChooserConfig(pernosco_active=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/")
    assert response.status_code == 200
    assert b'id="artifact"' not in response.data
    assert b'id="artifact-option"' not in response.data


def test_try_chooser_pernosco_ignores_artifact_form_field(
    tg, queue: multiprocessing.Queue
):
    app = create_application(tg, queue, ChooserConfig(pernosco_active=True))
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.post(
        "/",
        data={
            "action": "Push",
            "selected-tasks": "build-windows",
            "artifact": "on",
        },
    )
    assert response.status_code == 200
    assert queue.get() == {"tasks": ["build-windows"], "use_artifact": False}


@pytest.mark.parametrize(
    "initial,final,starting_config,expected",
    [
        # Fresh chooser, user leaves artifact off.
        (False, False, {}, {}),
        # Fresh chooser, user checks artifact.
        (
            False,
            True,
            {},
            {"use-artifact-builds": True, "disable-pgo": True},
        ),
        # Launched with --artifact, user keeps it on.
        (
            True,
            True,
            {"use-artifact-builds": True, "disable-pgo": True},
            {"use-artifact-builds": True, "disable-pgo": True},
        ),
        # Launched with --artifact, user toggles off: both keys cleared.
        (
            True,
            False,
            {"use-artifact-builds": True, "disable-pgo": True},
            {},
        ),
        # Launched with --disable-pgo (no --artifact), user left artifact off:
        # disable-pgo is preserved.
        (False, False, {"disable-pgo": True}, {"disable-pgo": True}),
        # Launched with --disable-pgo, user turned artifact on.
        (
            False,
            True,
            {"disable-pgo": True},
            {"use-artifact-builds": True, "disable-pgo": True},
        ),
    ],
)
def test_resolve_artifact_state(initial, final, starting_config, expected):
    cfg = dict(starting_config)
    resolve_artifact_state(cfg, initial, final)
    assert cfg == expected


@pytest.mark.parametrize(
    "try_task_config,expected",
    [
        ({}, (1, False)),
        ({"rebuild": 5}, (5, False)),
        ({"priority": "low"}, (1, True)),
        ({"rebuild": 3, "priority": "lowest"}, (3, True)),
    ],
)
def test_resolve_large_push_context(try_task_config, expected):
    assert resolve_large_push_context(try_task_config) == expected


if __name__ == "__main__":
    mozunit.main()
