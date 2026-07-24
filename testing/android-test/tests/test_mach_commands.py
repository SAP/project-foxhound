#!/usr/bin/env python
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import os
import sys
import unittest
from unittest import mock

from mach.registrar import Registrar
from mozunit import main

# Ensure testing category is registered before importing mach_commands
Registrar.categories["testing"] = []
Registrar.commands_by_category["testing"] = set()
Registrar.register_category("testing", "testing", "testing")

# Add parent directory to path to import mach_commands
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from mach_commands import (
    classname_for_test,
    flavor_for_test,
    project_for_ac,
    project_for_test,
)


class TestAndroidMachCommands(unittest.TestCase):
    TEST_CASES = [
        # (test_path, expected_project, expected_component, expected_flavor, expected_class)
        (
            "mobile/android/geckoview/src/test/java/org/mozilla/gecko/util/GeckoBundleTest.java",
            "geckoview",
            None,
            "unit",
            "org.mozilla.gecko.util.GeckoBundleTest",
        ),
        (
            "mobile/android/android-components/components/concept/engine/src/test/java/mozilla/components/concept/engine/EngineTest.kt",
            "android-components",
            "concept-engine",
            "unit",
            "mozilla.components.concept.engine.EngineTest",
        ),
        (
            "mobile/android/android-components/components/browser/engine-gecko/src/test/java/mozilla/components/browser/engine/gecko/GeckoEngineTest.kt",
            "android-components",
            "browser-engine-gecko",
            "unit",
            "mozilla.components.browser.engine.gecko.GeckoEngineTest",
        ),
        (
            "mobile/android/fenix/app/src/test/java/org/mozilla/fenix/home/HomeFragmentTest.kt",
            "fenix",
            None,
            "unit",
            "org.mozilla.fenix.home.HomeFragmentTest",
        ),
        (
            "mobile/android/focus-android/app/src/test/java/org/mozilla/focus/components/EngineProviderTest.kt",
            "focus-android",
            None,
            "unit",
            "org.mozilla.focus.components.EngineProviderTest",
        ),
        (
            "mobile/android/fenix/app/src/androidTest/java/org/mozilla/fenix/components/MenuItemTest.kt",
            "fenix",
            None,
            "android",
            "org.mozilla.fenix.components.MenuItemTest",
        ),
    ]

    def cleanup_gradle_args(self, args):
        """Given a list of arguments for a gradle invocation, remove those that are not
        interesting for this test suite to simplify matching."""
        IGNORE = ["-q", "--rerun"]
        return [x for x in args if x not in IGNORE]

    def test_classname_for_test(self):
        """Test extraction of class name from test path."""
        TEST_PATH_PREFIX = "src/test/java"
        ANDROIDTEST_PATH_PREFIX = "src/androidTest/java"
        for test_path, _, _, _, expected in self.TEST_CASES:
            with self.subTest(test_path=test_path):
                if flavor_for_test(test_path) == "unit":
                    result = classname_for_test(test_path, TEST_PATH_PREFIX)
                else:
                    result = classname_for_test(test_path, ANDROIDTEST_PATH_PREFIX)
                self.assertEqual(result, expected)

    def test_project_for_test(self):
        """Test extraction of project name from test path."""
        PROJECT_PREFIX = "mobile/android"

        for test_path, expected, _, _, _ in self.TEST_CASES:
            with self.subTest(project=expected):
                result = project_for_test(test_path, PROJECT_PREFIX)
                self.assertEqual(result, expected)

    def test_project_for_ac(self):
        """Test extraction of android-components subproject name."""
        COMPONENT_PREFIX = "mobile/android/android-components/components"
        TEST_PATH_PREFIX = "src/test/java"
        for test_path, project, expected, _, _ in self.TEST_CASES:
            if project != "android-components":
                continue
            with self.subTest(component=expected):
                result = project_for_ac(test_path, COMPONENT_PREFIX, TEST_PATH_PREFIX)
                self.assertEqual(result, expected)

    def test_flavor_for_test(self):
        """Test extraction of test flavor from test path."""
        for test_path, _, _, expected, _ in self.TEST_CASES:
            with self.subTest(flavor=expected):
                result = flavor_for_test(test_path)
                self.assertEqual(result, expected)

    def test_android_test_implicit_subproject(self):
        """Test that run_android_test derives subproject if a specific test is requested."""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = command_context._mach_context.commands.dispatch = (
            mock.MagicMock(return_value=0)
        )

        TEST_PATH = "mobile/android/focus-android/app/src/test/java/org/mozilla/focus/components/EngineProviderTest.kt"
        run_android_test(command_context, subproject=None, test=TEST_PATH)

        mock_dispatch.assert_called_once()
        gradle_args = mock_dispatch.call_args[1]["args"]
        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            [
                "-p",
                "mobile/android/focus-android/app",
                "testFocusDebugUnitTest",
                "--tests",
                "org.mozilla.focus.components.EngineProviderTest",
            ],
        )

    def test_run_android_test_fenix(self):
        """Test that run_android_test calls dispatch with correct arguments for fenix."""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = command_context._mach_context.commands.dispatch = (
            mock.MagicMock(return_value=0)
        )

        run_android_test(
            command_context,
            subproject="fenix",
        )

        mock_dispatch.assert_called_once()
        gradle_args = mock_dispatch.call_args[1]["args"]

        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            ["-p", "mobile/android/fenix/app", "testDebugUnitTest"],
        )

    def test_run_android_test_androidTest(self):
        """Test that run_android_test can run instrumented test types."""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = command_context._mach_context.commands.dispatch = (
            mock.MagicMock(return_value=0)
        )

        TEST_PATH = "mobile/android/fenix/app/src/androidTest/java/org/mozilla/fenix/components/MenuItemTest.kt"
        run_android_test(
            command_context,
            subproject=None,
            test=TEST_PATH,
        )

        mock_dispatch.assert_called_once()
        gradle_args = mock_dispatch.call_args[1]["args"]

        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            [
                "-p",
                "mobile/android/fenix/app",
                "connectedDebugAndroidTest",
                "-Pandroid.testInstrumentationRunnerArguments.class=org.mozilla.fenix.components.MenuItemTest",
            ],
        )

    def test_run_android_test_gradle_variant(self):
        """Test that run_android_test handles --gradle-variant."""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = command_context._mach_context.commands.dispatch = (
            mock.MagicMock(return_value=0)
        )

        run_android_test(
            command_context,
            subproject="geckoview",
            gradle_variant="Release",
        )

        mock_dispatch.assert_called_once()
        gradle_args = mock_dispatch.call_args[1]["args"]

        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            ["-p", "mobile/android/geckoview", "testReleaseUnitTest"],
        )

    def test_run_android_test_flavor(self):
        """Test that run_android_test handles --flavor."""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = command_context._mach_context.commands.dispatch = (
            mock.MagicMock(return_value=0)
        )

        run_android_test(
            command_context,
            subproject="geckoview",
            flavor="both",
        )

        mock_dispatch.assert_called_once()
        gradle_args = mock_dispatch.call_args[1]["args"]

        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            [
                "-p",
                "mobile/android/geckoview",
                "testDebugUnitTest",
                "connectedDebugAndroidTest",
            ],
        )

    def test_run_android_test_with_multi_component(self):
        """Test that multiple android-component tests resolve the their component projects"""
        from mach_commands import run_android_test

        command_context = mock.MagicMock()
        mock_dispatch = mock.MagicMock(return_value=0)
        command_context._mach_context.commands.dispatch = mock_dispatch

        test_objects = [
            {
                "name": "mobile/android/android-components/components/concept/engine/src/test/java/mozilla/components/concept/engine/EngineTest.kt",
            },
            {
                "name": "mobile/android/android-components/components/concept/engine/src/test/java/mozilla/components/concept/engine/EngineViewTest.kt",
            },
            {
                "name": "mobile/android/android-components/components/browser/engine-gecko/src/test/java/mozilla/components/browser/engine/gecko/GeckoEngineTest.kt",
            },
            {
                "name": "mobile/android/android-components/components/browser/engine-gecko/src/androidTest/java/mozilla/components/browser/engine/gecko/fetch/geckoview/GeckoViewFetchTestCases.kt",
            },
        ]

        run_android_test(
            command_context,
            subproject="android-components",
            test_objects=test_objects,
        )

        gradle_args = mock_dispatch.call_args[1]["args"]
        self.assertEqual(
            self.cleanup_gradle_args(gradle_args),
            [
                "-p",
                "mobile/android/android-components",
                ":components:concept-engine:testDebugUnitTest",
                ":components:browser-engine-gecko:testDebugUnitTest",
                "--tests",
                "mozilla.components.concept.engine.EngineTest",
                "--tests",
                "mozilla.components.concept.engine.EngineViewTest",
                "--tests",
                "mozilla.components.browser.engine.gecko.GeckoEngineTest",
                ":components:browser-engine-gecko:connectedDebugAndroidTest",
                "-Pandroid.testInstrumentationRunnerArguments.class=mozilla.components.browser.engine.gecko.fetch.geckoview.GeckoViewFetchTestCases",
            ],
        )


if __name__ == "__main__":
    main()
