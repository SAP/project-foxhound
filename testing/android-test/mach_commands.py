# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# Integrates android tests with mach

import os

from mach.decorators import Command, CommandArgument


def classname_for_test(test, test_path):
    """Convert path of test file to gradle recognized test suite name"""
    # Example:
    # test      = mobile/android/android-components/components/feature/addons/src/test/java/mozilla/components/feature/addons/ui/PermissionsDialogFragmentTest.kt
    # test_path = src/test/java
    # returns   = mozilla.components.feature.addons.ui.PermissionsDialogFragmentTest
    return (
        os.path
        .normpath(test)
        .split(os.path.normpath(test_path))[-1]
        .removeprefix(os.path.sep)
        .replace(os.path.sep, ".")
        .removesuffix(".kt")
        .removesuffix(".java")
    )


def project_for_test(test, prefix):
    """Get android project that test belongs to"""
    # Example:
    # test      = mobile/android/android-components/components/feature/addons/src/test/java/mozilla/components/feature/addons/ui/PermissionsDialogFragmentTest.kt
    # prefix    = mobile/android
    # returns   = android-components
    return (
        os.path
        .normpath(test)
        .split(os.path.normpath(prefix))[-1]
        .removeprefix(os.path.sep)
        .split(os.path.sep)[0]
    )


def project_for_ac(test, prefix, test_path):
    """Get project name for android-component subprojects from path of test file"""
    # Example:
    # test      = mobile/android/android-components/components/feature/addons/src/test/java/mozilla/components/feature/addons/ui/PermissionsDialogFragmentTest.kt
    # prefix    = mobile/android/android-components/components
    # test_path = src/test/java
    # returns   = feature-addons
    return (
        os.path
        .normpath(test)
        .split(os.path.normpath(prefix))[-1]
        .split(os.path.normpath(test_path))[0]
        .removeprefix(os.path.sep)
        .removesuffix(os.path.sep)
        .replace(os.path.sep, "-")
    )


def flavor_for_test(test):
    """Get the type of the test"""
    # Example:
    # test      = mobile/android/fenix/app/src/androidTest/java/org/mozilla/fenix/components/MenuItemTest.kt
    # returns   = android

    for lang in ("java", "kotlin"):
        android_prefix = os.path.join("src", "androidTest", lang)
        if android_prefix in os.path.normpath(test):
            return "android"
    return "unit"


def submodule_for_test(test, subdir):
    """Get the nested sub-module name for a test, or None if in root module."""
    # mobile/android/fenix/app/longfox/src/... -> "longfox"
    # mobile/android/fenix/app/src/...         -> None
    after_subdir = (
        os.path
        .normpath(test)
        .split(os.path.normpath(subdir))[-1]
        .removeprefix(os.path.sep)
    )
    first = after_subdir.split(os.path.sep)[0]
    if first == "src":
        return None
    return first


def source_dir_for_test(test, base="test"):
    """Return src/<base>/kotlin or src/<base>/java depending on the test path."""
    kotlin_path = os.path.join("src", base, "kotlin")
    if kotlin_path in os.path.normpath(test):
        return kotlin_path
    return os.path.join("src", base, "java")


@Command(
    "android-test",
    category="testing",
    description="Run Android tests.",
)
@CommandArgument(
    "--subproject",
    default="fenix",
    choices=["fenix", "focus", "android-components", "ac", "geckoview", "gv"],
    help="Android subproject to run tests for.",
)
@CommandArgument(
    "--flavor",
    default="unit",
    choices=["unit", "android", "both"],
    help="The unit test suite runs on host using JUnit or Robolectric, while"
    + " the android suite requires an emulator or device. This is determined"
    + " automatically if a specific test is specified.",
)
@CommandArgument(
    "--gradle-variant",
    default=None,
    help="The gradle project variant to use (eg. Debug, FocusNightly).",
)
@CommandArgument(
    "--test",
    default=None,
    help="File path of test to run.",
)
def run_android_test(
    command_context,
    subproject,
    flavor="unit",
    gradle_variant=None,
    test=None,
    test_objects=[],
    **kwargs,
):
    # Test paths may be a single command line, or a list from the test harness
    tests = [test["name"] for test in test_objects]
    if test:
        tests.append(test.strip())

    # Override subproject if test explicitly set
    if test:
        prefix = os.path.join("mobile", "android")
        subproject = project_for_test(test, prefix)

    # Resolve subproject aliases to match directory name as the canonical one
    ALIASES = {
        "focus": "focus-android",
        "ac": "android-components",
        "gv": "geckoview",
    }
    subproject = ALIASES.get(subproject, subproject)

    # Determine default gradle variant
    if not gradle_variant:
        gradle_variant = "FocusDebug" if (subproject == "focus-android") else "Debug"

    # Runs gradle in "quiet" mode
    gradle_command = ["-q"]

    # Determine gradle project directory
    if subproject == "fenix":
        subdir = os.path.join("mobile", "android", "fenix", "app")
    elif subproject == "focus-android":
        subdir = os.path.join("mobile", "android", "focus-android", "app")
    elif subproject == "android-components":
        subdir = os.path.join("mobile", "android", "android-components")
    elif subproject == "geckoview":
        subdir = os.path.join("mobile", "android", "geckoview")
    else:
        return None
    gradle_command.append("-p")
    gradle_command.append(subdir)

    # Partition tests based on type
    unit_tests = [t for t in tests if flavor_for_test(t) == "unit"]
    android_tests = [t for t in tests if flavor_for_test(t) == "android"]

    def project_name(test, test_path):
        prefix = os.path.join(subdir, "components")
        return project_for_ac(test, prefix, test_path)

    def append_unit_test_args(task, tests, source_base="test"):
        gradle_command.append(task)
        gradle_command.append("--rerun")
        for t in tests:
            gradle_command.append("--tests")
            gradle_command.append(
                classname_for_test(t, source_dir_for_test(t, source_base))
            )

    def append_android_test_args(task, tests, source_base="androidTest"):
        gradle_command.append(task)
        for t in tests:
            name = classname_for_test(t, source_dir_for_test(t, source_base))
            gradle_command.append(
                f"-Pandroid.testInstrumentationRunnerArguments.class={name}"
            )

    # Tests based on 'testUnitTest' family of tasks
    gradle_unittest = f"test{gradle_variant}UnitTest"
    if unit_tests:
        if subproject == "android-components":
            test_path = os.path.join("src", "test", "java")
            for p in dict.fromkeys(project_name(t, test_path) for t in unit_tests):
                component_tests = [
                    t for t in unit_tests if project_name(t, test_path) == p
                ]
                append_unit_test_args(
                    f":components:{p}:{gradle_unittest}", component_tests
                )
        else:
            gradle_project = os.path.basename(subdir)
            tests_by_module = {}
            for t in unit_tests:
                sm = submodule_for_test(t, subdir)
                tests_by_module.setdefault(sm, []).append(t)

            for sm, module_tests in tests_by_module.items():
                task_prefix = (
                    f":{gradle_project}:{sm}:" if sm else f":{gradle_project}:"
                )
                append_unit_test_args(f"{task_prefix}{gradle_unittest}", module_tests)

    # Tests based on 'connectedAndroidTest' family of tasks
    gradle_androidtest = f"connected{gradle_variant}AndroidTest"
    if android_tests:
        if subproject == "android-components":
            test_path = os.path.join("src", "androidTest", "java")
            for p in dict.fromkeys(project_name(t, test_path) for t in android_tests):
                component_tests = [
                    t for t in android_tests if project_name(t, test_path) == p
                ]
                append_android_test_args(
                    f":components:{p}:{gradle_androidtest}", component_tests
                )
        else:
            gradle_project = os.path.basename(subdir)
            tests_by_module = {}
            for t in android_tests:
                sm = submodule_for_test(t, subdir)
                tests_by_module.setdefault(sm, []).append(t)

            for sm, module_tests in tests_by_module.items():
                task_prefix = (
                    f":{gradle_project}:{sm}:" if sm else f":{gradle_project}:"
                )
                append_android_test_args(
                    f"{task_prefix}{gradle_androidtest}", module_tests
                )

    # If no tests specified, run whole suite based on flavor
    if not tests:
        if flavor in ("both", "unit"):
            gradle_command.append(gradle_unittest)
        if flavor in ("both", "android"):
            gradle_command.append(gradle_androidtest)

    return command_context._mach_context.commands.dispatch(
        "gradle", command_context._mach_context, args=gradle_command
    )
