from unittest.mock import patch

import mozunit
import pytest
from tryselect import push


@pytest.mark.parametrize(
    "method,labels,params,routes,expected",
    (
        pytest.param(
            "fuzzy",
            ["task-foo", "task-bar"],
            None,
            None,
            {
                "parameters": {
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "tasks": ["task-bar", "task-foo"],
                    },
                },
                "version": 2,
            },
            id="basic",
        ),
        pytest.param(
            "fuzzy",
            ["task-foo"],
            {"existing_tasks": {"task-foo": "123", "task-bar": "abc"}},
            None,
            {
                "parameters": {
                    "existing_tasks": {"task-bar": "abc"},
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "tasks": ["task-foo"],
                    },
                },
                "version": 2,
            },
            id="existing_tasks",
        ),
        pytest.param(
            "fuzzy",
            ["task-" + str(i) for i in range(1001)],  # 1001 tasks, over threshold
            None,
            None,
            {
                "parameters": {
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "priority": "lowest",
                        "tasks": sorted(["task-" + str(i) for i in range(1001)]),
                    },
                },
                "version": 2,
            },
            id="large_push_with_priority",
        ),
        pytest.param(
            "fuzzy",
            ["task-" + str(i) for i in range(500)],  # 500 tasks with rebuild=3
            {"try_task_config": {"rebuild": 3}},
            None,
            {
                "parameters": {
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "priority": "lowest",
                        "rebuild": 3,
                        "tasks": sorted(["task-" + str(i) for i in range(500)]),
                    },
                },
                "version": 2,
            },
            id="large_push_with_rebuild",
        ),
        pytest.param(
            "fuzzy",
            ["task-" + str(i) for i in range(100)],  # Under threshold
            None,
            None,
            {
                "parameters": {
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "tasks": sorted(["task-" + str(i) for i in range(100)]),
                    },
                },
                "version": 2,
            },
            id="small_push_no_priority",
        ),
        pytest.param(
            "fuzzy",
            [
                "task-" + str(i) for i in range(1001)
            ],  # Large push with existing priority
            {"try_task_config": {"priority": "low"}},
            None,
            {
                "parameters": {
                    "optimize_target_tasks": False,
                    "try_task_config": {
                        "env": {"TRY_SELECTOR": "fuzzy"},
                        "priority": "low",  # Should keep existing priority
                        "tasks": sorted(["task-" + str(i) for i in range(1001)]),
                    },
                },
                "version": 2,
            },
            id="large_push_existing_priority",
        ),
    ),
)
def test_generate_try_task_config(method, labels, params, routes, expected):
    # Simulate user responding "yes" to the large push prompt
    with patch("builtins.input", return_value="y"):
        assert (
            push.generate_try_task_config(method, labels, params=params, routes=routes)
            == expected
        )


def test_large_push_user_declines():
    """Test that when user declines large push warning, the system exits."""
    with patch("builtins.input", return_value="n"):
        with pytest.raises(SystemExit) as exc_info:
            push.generate_try_task_config(
                "fuzzy",
                ["task-" + str(i) for i in range(1001)],
            )
        assert exc_info.value.code == 1


def test_large_push_warning_message(capsys):
    """Test that the warning message is displayed for large pushes."""
    with patch("builtins.input", return_value="y"):
        push.generate_try_task_config(
            "fuzzy",
            ["task-" + str(i) for i in range(1001)],
        )
        captured = capsys.readouterr()
        assert "Your push would schedule at least 1001 tasks" in captured.out
        assert "lower priority" in captured.out


def test_get_sys_argv():
    input_argv = [
        "./mach",
        "try",
        "fuzzy",
        "--full",
        "--artifact",
        "--push-to-vcs",
        "--query",
        "'android-hw !shippable !nofis",
        "--no-push",
    ]
    expected_string = './mach try fuzzy --full --artifact --push-to-vcs --query "\'android-hw !shippable !nofis" --no-push'
    assert push.get_sys_argv(input_argv) == expected_string


def test_get_sys_argv_2():
    input_argv = [
        "./mach",
        "try",
        "fuzzy",
        "--query",
        "'test-linux1804-64-qr/opt-mochitest-plain-",
        "--worker-override=t-linux-large=gecko-t/t-linux-2204-wayland-experimental",
        "--no-push",
    ]
    expected_string = './mach try fuzzy --query "\'test-linux1804-64-qr/opt-mochitest-plain-" --worker-override=t-linux-large=gecko-t/t-linux-2204-wayland-experimental --no-push'
    assert push.get_sys_argv(input_argv) == expected_string


if __name__ == "__main__":
    mozunit.main()
