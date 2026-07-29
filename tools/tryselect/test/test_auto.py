# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import mozunit
import pytest
from tryselect.selectors.auto import AutoParser


def test_strategy_validation():
    parser = AutoParser()
    args = parser.parse_args(["--strategy", "relevant_tests"])
    assert args.strategy == "gecko_taskgraph.optimize:tryselect.relevant_tests"

    args = parser.parse_args([
        "--strategy",
        "gecko_taskgraph.optimize:experimental.relevant_tests",
    ])
    assert args.strategy == "gecko_taskgraph.optimize:experimental.relevant_tests"

    with pytest.raises(SystemExit):
        parser.parse_args(["--strategy", "gecko_taskgraph.optimize:tryselect"])

    with pytest.raises(SystemExit):
        parser.parse_args(["--strategy", "foo"])

    with pytest.raises(SystemExit):
        parser.parse_args(["--strategy", "foo:bar"])


def test_returns_zero_exit_code(run_mach):
    """Test that mach try auto returns exit code 0 when selector returns None."""
    # Run with --no-push which causes push_to_try to return None
    # The exit code should be normalized to 0
    assert run_mach(["try", "auto", "--no-push"]) == 0


def test_returns_zero_with_job_id(run_mach, mock_push_to_lando_try):
    """Test that mach try auto returns 0 even when push_to_lando_try returns job data."""
    assert run_mach(["try", "auto"]) == 0


def test_returns_error_exit_code(run_mach):
    """Test that mach try commands return exit code 1 for runtime validation errors."""
    # Use 'try again' with invalid index to trigger a runtime error (not argparse)
    # This tests that our mach_commands.py run() preserves error code 1
    assert run_mach(["try", "again", "--index", "invalid_value"]) == 1


if __name__ == "__main__":
    mozunit.main()
