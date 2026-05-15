# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import hashlib
import json
import logging
import os
import sys
import textwrap
from collections import defaultdict
from pathlib import Path

import mozunit
import pytest
from buildconfig import topsrcdir
from mach.util import get_state_dir
from mozpack.files import JarFinder
from mozpack.mozjar import JarReader
from mozprocess import ProcessHandler

logger = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def test_dir():
    return (
        Path(get_state_dir(specific_to_topsrcdir=True, topsrcdir=topsrcdir))
        / "android-gradle-build"
    )


@pytest.fixture(scope="session")
def objdir(test_dir):
    return test_dir / "objdir"


@pytest.fixture(scope="session")
def mozconfig(test_dir, objdir):
    mozconfig_path = test_dir / "mozconfig"
    mozconfig_path.parent.mkdir(parents=True, exist_ok=True)
    mozconfig_path.write_text(
        textwrap.dedent(
            f"""
                ac_add_options --enable-application=mobile/android
                ac_add_options --enable-artifact-builds
                ac_add_options --target=arm
                mk_add_options MOZ_OBJDIR="{objdir}"
                export GRADLE_FLAGS="-PbuildMetrics -PbuildMetricsOutputDir={objdir}/gradle/build/metrics -PbuildMetricsFileSuffix=test"
            """
        )
    )
    return mozconfig_path


@pytest.fixture(scope="session")
def run_mach(mozconfig):
    def inner(argv, cwd=None):
        env = os.environ.copy()
        env["MOZCONFIG"] = str(mozconfig)
        env["MACH_NO_TERMINAL_FOOTER"] = "1"
        env["MACH_NO_WRITE_TIMES"] = "1"

        if os.environ.get("MOZ_AUTOMATION"):
            env["MACH_BUILD_PYTHON_NATIVE_PACKAGE_SOURCE"] = "system"

        def pol(line):
            logger.debug(line)

        proc = ProcessHandler(
            [sys.executable, "mach"] + argv,
            env=env,
            cwd=cwd or topsrcdir,
            processOutputLine=pol,
            universal_newlines=True,
        )
        proc.run()
        proc.wait()

        return proc.poll(), proc.output

    return inner


AARS = {
    "geckoview.aar": "gradle/build/mobile/android/geckoview/outputs/aar/geckoview-debug.aar",
}


APKS = {
    "test_runner.apk": "gradle/build/mobile/android/test_runner/outputs/apk/debug/test_runner-debug.apk",
    "androidTest": "gradle/build/mobile/android/geckoview/outputs/apk/androidTest/debug/geckoview-debug-androidTest.apk",
    "geckoview_example.apk": "gradle/build/mobile/android/geckoview_example/outputs/apk/debug/geckoview_example-debug.apk",
    "messaging_example.apk": "gradle/build/mobile/android/examples/messaging_example/app/outputs/apk/debug/messaging_example-debug.apk",
    "port_messaging_example.apk": "gradle/build/mobile/android/examples/port_messaging_example/app/outputs/apk/debug/port_messaging_example-debug.apk",
}


def hashes(objdir, pattern, targets={**AARS, **APKS}):
    target_to_hash = {}
    hash_to_target = defaultdict(list)
    for shortname, target in targets.items():
        finder = JarFinder(target, JarReader(str(objdir / target)))
        hasher = hashlib.blake2b()

        # We sort paths.  This allows a pattern like `classes*.dex` to capture
        # changes to any of the DEX files, no matter how they are ordered in an
        # AAR or APK.
        for p, f in sorted(finder.find(pattern), key=lambda x: x[0]):
            fp = f.open()
            while True:
                data = fp.read(8192)
                if not len(data):
                    break
                hasher.update(data)

        h = hasher.hexdigest()
        target_to_hash[shortname] = h
        hash_to_target[h].append(shortname)

    return target_to_hash, hash_to_target


def get_test_run_build_metrics(objdir):
    """Find and load the build-metrics JSON file for our test run."""
    log_dir = objdir / "gradle" / "build" / "metrics"
    if not log_dir.exists():
        return None

    suffix = "test"
    build_metrics_file = log_dir / f"build-metrics-{suffix}.json"

    try:
        with build_metrics_file.open(encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning(f"Failed to load build metrics from {build_metrics_file}: {e}")
        return None


def assert_success(returncode, output):
    """Assert that a command succeeded, showing output on failure."""
    if returncode != 0:
        output_lines = output if isinstance(output, list) else output.splitlines()

        if os.environ.get("MOZ_AUTOMATION"):
            final_output = "\n".join(output_lines)
        else:
            tail_lines = (
                output_lines[-100:] if len(output_lines) > 100 else output_lines
            )
            final_output = (
                f"Last {len(tail_lines)} of {len(output_lines)} lines of output:\n\n"
                + "\n".join(tail_lines)
            )
        pytest.fail(f"Command failed with return code: {returncode}\n{final_output}")


def assert_all_task_statuses(objdir, acceptable_statuses, always_executed_tasks=None):
    """Asserts that all tasks in build metrics have acceptable statuses."""

    if always_executed_tasks is None:
        always_executed_tasks = [
            ":machBuildFaster",
            ":machStagePackage",
            # Always executes because it depends on assets from ${topobjdir}/dist/geckoview/assets
            # which get timestamps updated by the mach tasks above. Takes 0.000 seconds so not
            # a performance issue, but will be resolved when mach tasks get proper Gradle dependencies.
            ":geckoview:generateDebugAssets",
            # Always executes because suppressUselessCastInSafeArgs sets `outputs.upToDateWhen { false }`.
            # We could try using a marker file otherwise, but the task runtime is negligible and the added
            # complexity doesn't seem worth it for what should only be a short-term workaround until Google
            # fixes the upstream Navigation bug that led to it being added in the first place.
            ":fenix:generateSafeArgsDebug",
            ":fenix:suppressUselessCastInSafeArgs",
        ]

    build_metrics = get_test_run_build_metrics(objdir)
    assert build_metrics is not None, "Build metrics JSON not found"
    assert "tasks" in build_metrics, "Build metrics missing 'tasks' section"

    metrics_tasks = build_metrics.get("tasks", [])

    for task in metrics_tasks:
        task_name = task.get("path")
        actual_status = task.get("status")

        if task_name in always_executed_tasks:
            assert actual_status == "EXECUTED", (
                f"Task {task_name} should always execute, got '{actual_status}'"
            )
        else:
            assert actual_status in acceptable_statuses, (
                f"Task {task_name} had status '{actual_status}', expected one of {acceptable_statuses}"
            )


def assert_ordered_task_outcomes(objdir, ordered_expected_task_statuses):
    """Takes a list of (task_name, expected_status) tuples and verifies that they appear
    in the build metrics in the same order with the expected statuses.
    """
    # Get build metrics and fail if not found
    build_metrics = get_test_run_build_metrics(objdir)
    assert build_metrics is not None, "Build metrics JSON not found"
    assert "tasks" in build_metrics, "Build metrics missing 'tasks' section"

    # Extract tasks from metrics in order
    metrics_tasks = build_metrics.get("tasks", [])
    expected_task_names = {task_name for task_name, _ in ordered_expected_task_statuses}
    task_order = [
        task.get("path")
        for task in metrics_tasks
        if task.get("path") in expected_task_names
    ]
    expected_order = [task_name for task_name, _ in ordered_expected_task_statuses]

    # Check that all expected tasks were found
    missing_tasks = expected_task_names - set(task_order)
    assert not missing_tasks, f"Tasks not found in build metrics: {missing_tasks}"

    # Check order matches expectation
    assert task_order == expected_order, (
        f"Task execution order mismatch. Expected: {expected_order}, Got: {task_order}"
    )

    # Check statuses for each task
    task_lookup = {task.get("path"): task for task in metrics_tasks}
    for task_name, expected_status in ordered_expected_task_statuses:
        task_info = task_lookup[task_name]
        actual_status = task_info.get("status")
        assert actual_status == expected_status, (
            f"Task {task_name} had status '{actual_status}', expected '{expected_status}'"
        )


def test_artifact_build(objdir, mozconfig, run_mach):
    assert_success(*run_mach(["build"]))
    # Order matters, since `mach build stage-package` depends on the
    # outputs of `mach build faster`.
    assert_ordered_task_outcomes(
        objdir, [(":machBuildFaster", "SKIPPED"), (":machStagePackage", "SKIPPED")]
    )

    _, omnijar_hash_to = hashes(objdir, "assets/omni.ja")
    assert len(omnijar_hash_to) == 1
    (omnijar_hash_orig,) = omnijar_hash_to.values()

    assert_success(*run_mach(["gradle", "geckoview_example:assembleDebug"]))
    # Order matters, since `mach build stage-package` depends on the
    # outputs of `mach build faster`.
    assert_ordered_task_outcomes(
        objdir, [(":machBuildFaster", "EXECUTED"), (":machStagePackage", "EXECUTED")]
    )

    _, omnijar_hash_to = hashes(objdir, "assets/omni.ja")
    assert len(omnijar_hash_to) == 1
    (omnijar_hash_new,) = omnijar_hash_to.values()

    assert omnijar_hash_orig == omnijar_hash_new


def test_minify_fenix_incremental_build(objdir, mozconfig, run_mach):
    """Verify that minifyReleaseWithR8 is UP-TO-DATE on a subsequent
    run when there are no code changes.
    """

    # Ensure a clean state
    assert_success(*run_mach(["gradle", ":fenix:cleanMinifyReleaseWithR8"]))
    assert_success(*run_mach(["gradle", ":fenix:minifyReleaseWithR8"]))
    assert_ordered_task_outcomes(objdir, [(":fenix:minifyReleaseWithR8", "EXECUTED")])

    assert_success(*run_mach(["gradle", ":fenix:minifyReleaseWithR8"]))
    assert_ordered_task_outcomes(objdir, [(":fenix:minifyReleaseWithR8", "UP-TO-DATE")])


def test_geckoview_build(objdir, mozconfig, run_mach):
    assert_success(*run_mach(["build"]))
    assert_success(*run_mach(["gradle", "geckoview:clean"]))
    assert_success(*run_mach(["gradle", "geckoview:assembleDebug"]))
    assert_all_task_statuses(objdir, ["EXECUTED", "UP-TO-DATE", "SKIPPED"])

    assert_success(*run_mach(["gradle", "geckoview:assembleDebug"]))
    assert_all_task_statuses(objdir, ["UP-TO-DATE", "SKIPPED"])


def test_fenix_build(objdir, mozconfig, run_mach):
    assert_success(*run_mach(["build"]))
    assert_success(
        *run_mach(["gradle", "fenix:clean", ":components:support-base:clean"])
    )
    assert_success(*run_mach(["gradle", "fenix:assembleDebug"]))
    assert_ordered_task_outcomes(
        objdir, [(":components:support-base:generateComponentEnum", "EXECUTED")]
    )
    assert_all_task_statuses(objdir, ["EXECUTED", "UP-TO-DATE", "SKIPPED"])

    assert_success(*run_mach(["gradle", "fenix:assembleDebug"]))
    assert_ordered_task_outcomes(
        objdir, [(":components:support-base:generateComponentEnum", "UP-TO-DATE")]
    )
    assert_all_task_statuses(objdir, ["UP-TO-DATE", "SKIPPED"])


def test_focus_build(objdir, mozconfig, run_mach):
    assert_success(*run_mach(["build"]))
    assert_success(*run_mach(["gradle", "focus:clean"]))
    assert_success(*run_mach(["gradle", "focus:assembleDebug"]))
    assert_ordered_task_outcomes(
        objdir, [(":focus-android:generateLocaleList", "EXECUTED")]
    )
    assert_all_task_statuses(objdir, ["EXECUTED", "UP-TO-DATE", "SKIPPED"])

    assert_success(*run_mach(["gradle", "focus:assembleDebug"]))
    assert_ordered_task_outcomes(
        objdir, [(":focus-android:generateLocaleList", "UP-TO-DATE")]
    )
    assert_all_task_statuses(objdir, ["UP-TO-DATE", "SKIPPED"])


def test_android_export(objdir, mozconfig, run_mach):
    # To ensure a consistent state, we delete the marker file
    # to force the :verifyGleanVersion task to re-run.
    marker_file = objdir / "gradle" / "build" / "glean" / "verifyGleanVersion.marker"
    marker_file.unlink(missing_ok=True)

    bindings_dir = Path(topsrcdir) / "widget" / "android" / "bindings"
    inputs = list(bindings_dir.glob("*-classes.txt"))

    assert_success(*run_mach(["android", "export"] + [str(f) for f in inputs]))
    assert_ordered_task_outcomes(objdir, [(":verifyGleanVersion", "EXECUTED")])

    assert_success(*run_mach(["android", "export"] + [str(f) for f in inputs]))
    assert_ordered_task_outcomes(objdir, [(":verifyGleanVersion", "UP-TO-DATE")])


if __name__ == "__main__":
    mozunit.main()
