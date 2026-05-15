# -*- Mode: python; c-basic-offset: 4; indent-tabs-mode: nil; tab-width: 40 -*-
# vim: set filetype=python:
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import json
import os
import re
from filecmp import dircmp

from mozbuild.nodeutil import (
    package_setup,
    remove_directory,
)
from packaging.version import Version

VERSION_RE = re.compile(r"^\d+\.\d+\.\d+$")
CARET_VERSION_RANGE_RE = re.compile(r"^\^((\d+)\.\d+\.\d+)$")

project_root = None


def eslint_maybe_setup(package_root=None, package_name=None):
    """Setup ESLint only if it is needed."""

    if package_root is None:
        package_root = get_project_root()
    if package_name is None:
        package_name = "eslint"

    has_issues, needs_clobber = eslint_module_needs_setup(package_root, package_name)

    if has_issues:
        eslint_setup(package_root, package_name, needs_clobber)


def eslint_setup(package_root, package_name, should_clobber=False):
    """Ensure eslint is optimally configured.

    This command will inspect your eslint configuration and
    guide you through an interactive wizard helping you configure
    eslint for optimal use on Mozilla projects.
    """

    # Always remove the eslint-plugin-mozilla sub-directory as that can
    # sometimes conflict with the top level node_modules, see bug 1809036.
    remove_directory(
        os.path.join(get_eslint_module_path(), "eslint-plugin-mozilla", "node_modules")
    )

    orig_project_root = get_project_root()
    try:
        set_project_root(package_root)
        package_setup(package_root, package_name, should_clobber=should_clobber)
    finally:
        set_project_root(orig_project_root)


def expected_installed_modules(package_root, package_name):
    # Read the expected version of ESLint and external modules
    expected_modules_path = os.path.join(package_root, "package.json")
    with open(expected_modules_path, encoding="utf-8") as f:
        sections = json.load(f)
        expected_modules = sections.get("dependencies", {})
        expected_modules.update(sections.get("devDependencies", {}))

    if package_name == "eslint":
        # Also read the in-tree ESLint plugin mozilla information, to ensure the
        # dependencies are up to date.
        mozilla_json_path = os.path.join(
            get_eslint_module_path(), "eslint-plugin-mozilla", "package.json"
        )
        with open(mozilla_json_path, encoding="utf-8") as f:
            dependencies = json.load(f).get("dependencies", {})
            expected_modules.update(dependencies)

        # Also read the in-tree ESLint plugin spidermonkey information, to ensure the
        # dependencies are up to date.
        mozilla_json_path = os.path.join(
            get_eslint_module_path(), "eslint-plugin-spidermonkey-js", "package.json"
        )
        with open(mozilla_json_path, encoding="utf-8") as f:
            expected_modules.update(json.load(f).get("dependencies", {}))

    return expected_modules


def check_eslint_files(node_modules_path, name):
    def check_file_diffs(dcmp):
        # Diff files only looks at files that are different. Not for files
        # that are only present on one side. This should be generally OK as
        # new files will need to be added in the index.js for the package.
        if dcmp.diff_files and dcmp.diff_files != ["package.json"]:
            return True

        result = False

        # Again, we only look at common sub directories for the same reason
        # as above.
        for sub_dcmp in dcmp.subdirs.values():
            result = result or check_file_diffs(sub_dcmp)

        return result

    dcmp = dircmp(
        os.path.join(node_modules_path, name),
        os.path.join(get_eslint_module_path(), name),
    )

    return check_file_diffs(dcmp)


def eslint_module_needs_setup(package_root, package_name):
    has_issues = False
    needs_clobber = False
    node_modules_path = os.path.join(package_root, "node_modules")

    for name, expected_data in expected_installed_modules(
        package_root, package_name
    ).items():
        # expected_installed_modules package_root, package_namereturns a string for the version number of
        # dependencies for installation of eslint generally, and an object
        # for our in-tree plugins (which contains the entire module info).
        if "version" in expected_data:
            version_range = expected_data["version"]
        else:
            version_range = expected_data

        path = os.path.join(node_modules_path, name, "package.json")

        if not os.path.exists(path):
            print("%s v%s needs to be installed locally." % (name, version_range))
            has_issues = True
            continue
        data = json.load(open(path, encoding="utf-8"))

        if version_range.startswith("file:") or version_range.startswith("github:"):
            # We don't need to check local file installations for versions, as
            # these are symlinked, so we'll always pick up the latest.
            # For github versions, these are hard to sync, so we'll assume some other
            # module gets updated at the same time for now.
            continue

        if name == "eslint" and Version("4.0.0") > Version(data["version"]):
            print("ESLint is an old version, clobbering node_modules directory")
            needs_clobber = True
            has_issues = True
            continue

        if not version_in_range(data["version"], version_range):
            print("%s v%s should be v%s." % (name, data["version"], version_range))
            has_issues = True
            continue

    return has_issues, needs_clobber


def version_in_range(version, version_range):
    """
    Check if a module version is inside a version range.  Only supports explicit versions and
    caret ranges for the moment, since that's all we've used so far.
    """
    if version == version_range:
        return True

    version_match = VERSION_RE.match(version)
    if not version_match:
        raise RuntimeError("mach eslint doesn't understand module version %s" % version)
    version = Version(version)

    # Caret ranges as specified by npm allow changes that do not modify the left-most non-zero
    # digit in the [major, minor, patch] tuple.  The code below assumes the major digit is
    # non-zero.
    range_match = CARET_VERSION_RANGE_RE.match(version_range)
    if range_match:
        range_version = range_match.group(1)
        range_major = int(range_match.group(2))

        range_min = Version(range_version)
        range_max = Version("%d.0.0" % (range_major + 1))

        return range_min <= version < range_max

    return False


def set_project_root(root=None):
    """Sets the project root to the supplied path, or works out what the root
    is based on looking for 'mach'.

    Keyword arguments:
    root - (optional) The path to set the root to.
    """
    global project_root

    if root:
        project_root = root
        return

    file_found = False
    folder = os.getcwd()

    while folder:
        if os.path.exists(os.path.join(folder, "mach")):
            file_found = True
            break
        else:
            folder = os.path.dirname(folder)

    if file_found:
        project_root = os.path.abspath(folder)


def get_project_root():
    """Returns the absolute path to the root of the project, see set_project_root()
    for how this is determined.
    """

    if not project_root:
        set_project_root()

    return project_root


def get_eslint_module_path():
    return os.path.join(get_project_root(), "tools", "lint", "eslint")
