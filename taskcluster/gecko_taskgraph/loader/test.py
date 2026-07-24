# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import gzip
import json
import logging
import os

from mozbuild.util import memoize
from taskgraph.loader.transform import loader as transform_loader
from taskgraph.util.copy import deepcopy
from taskgraph.util.yaml import load_yaml

from gecko_taskgraph import TEST_CONFIGS
from gecko_taskgraph.util.chunking import resolver

logger = logging.getLogger(__name__)

ARTIFACTS_DIR = "artifacts"


def loader(kind, path, config, params, loaded_tasks, write_artifacts):
    """
    Generate tasks implementing Gecko tests.
    """

    builds_by_platform = get_builds_by_platform(
        dep_kind="build", loaded_tasks=loaded_tasks
    )
    signed_builds_by_platform = get_builds_by_platform(
        dep_kind="build-signing", loaded_tasks=loaded_tasks
    )

    # get the test platforms for those build tasks
    test_platforms_cfg = load_yaml(TEST_CONFIGS, "test-platforms.yml")
    test_platforms = get_test_platforms(
        test_platforms_cfg, builds_by_platform, signed_builds_by_platform
    )

    # expand the test sets for each of those platforms
    test_sets_cfg = load_yaml(TEST_CONFIGS, "test-sets.yml")
    test_platforms = expand_tests(test_sets_cfg, test_platforms, kind)

    # load the test descriptions
    tests = transform_loader(kind, path, config, params, loaded_tasks, write_artifacts)
    test_descriptions = {t.pop("name"): t for t in tests}

    # generate all tests for all test platforms
    for test_platform_name, test_platform in test_platforms.items():
        for test_name in test_platform["test-names"]:
            test = deepcopy(test_descriptions[test_name])
            test["build-platform"] = test_platform["build-platform"]
            test["test-platform"] = test_platform_name
            test["build-label"] = test_platform["build-label"]
            if test_platform.get("build-signing-label", None):
                test["build-signing-label"] = test_platform["build-signing-label"]

            test["build-attributes"] = test_platform["build-attributes"]
            test["test-name"] = test_name
            if test_platform.get("shippable"):
                test.setdefault("attributes", {})["shippable"] = True
                test["attributes"]["shipping_product"] = test_platform[
                    "shipping_product"
                ]

            logger.debug(
                "Generating tasks for test {} on platform {}".format(
                    test_name, test["test-platform"]
                )
            )
            yield test

    # this file was previously written out in `decision.py` alongside most
    # other decision task artifacts. it was moved here to accommodate tasks
    # being generated in subprocesses, and the fact that the `resolver` that
    # has the data is only updated in the subprocess.
    # see https://bugzilla.mozilla.org/show_bug.cgi?id=1989038 for additional
    # details
    # we must only write this file once, to ensure it is never overridden
    # we only need `tests-by-manifest` for web-platform-tests, so we need to
    # write it out from whichever kind contains them
    if kind == "web-platform-tests" and write_artifacts:
        if not os.path.isdir(ARTIFACTS_DIR):
            os.mkdir(ARTIFACTS_DIR)
        path = os.path.join(ARTIFACTS_DIR, "tests-by-manifest.json.gz")
        with gzip.open(path, "wb") as f:
            f.write(json.dumps(resolver.tests_by_manifest).encode("utf-8"))


def get_builds_by_platform(dep_kind, loaded_tasks):
    """Find the build tasks on which tests will depend, keyed by
    platform/type.  Returns a dictionary mapping build platform to task."""
    builds_by_platform = {}
    for task in loaded_tasks:
        if task.kind != dep_kind:
            continue

        build_platform = task.attributes.get("build_platform")
        build_type = task.attributes.get("build_type")
        if not build_platform or not build_type:
            continue
        platform = f"{build_platform}/{build_type}"
        if platform in builds_by_platform:
            raise Exception("multiple build jobs for " + platform)
        builds_by_platform[platform] = task
    return builds_by_platform


def get_test_platforms(
    test_platforms_cfg, builds_by_platform, signed_builds_by_platform={}
):
    """Get the test platforms for which test tasks should be generated,
    based on the available build platforms.  Returns a dictionary mapping
    test platform to {test-set, build-platform, build-label}."""
    test_platforms = {}
    for test_platform, cfg in test_platforms_cfg.items():
        build_platform = cfg["build-platform"]
        if build_platform not in builds_by_platform:
            logger.warning(
                f"No build task with platform {build_platform}; ignoring test platform {test_platform}"
            )
            continue
        test_platforms[test_platform] = {
            "build-platform": build_platform,
            "build-label": builds_by_platform[build_platform].label,
            "build-attributes": builds_by_platform[build_platform].attributes,
        }

        if builds_by_platform[build_platform].attributes.get("shippable"):
            test_platforms[test_platform]["shippable"] = builds_by_platform[
                build_platform
            ].attributes["shippable"]
            test_platforms[test_platform]["shipping_product"] = builds_by_platform[
                build_platform
            ].attributes["shipping_product"]

        test_platforms[test_platform].update(cfg)

    return test_platforms


PREFIX_BY_KIND = {
    "browsertime": {"browsertime"},
    "mochitest": {"mochitest"},
    "reftest": {"crashtest", "jsreftest", "reftest"},
    "web-platform-tests": {
        "web-platform-tests",
        "test-coverage-wpt",
        "test-verify-wpt",
    },
}


@memoize
def is_test_for_kind(test_name, kind):
    if kind == "test":
        # the test kind is special: we assume that it should contain any tests
        # that aren't included in an explicitly listed `kind`.
        # if/when the `test` kind goes away, this block should go away too
        for prefixes in PREFIX_BY_KIND.values():
            if any([test_name.startswith(prefix) for prefix in prefixes]):
                return False
        return True
    else:
        test_set_prefixes = PREFIX_BY_KIND[kind]
        return any([test_name.startswith(prefix) for prefix in test_set_prefixes])


def expand_tests(test_sets_cfg, test_platforms, kind):
    """Expand the test sets in `test_platforms` out to sets of test names.
    Returns a dictionary like `get_test_platforms`, with an additional
    `test-names` key for each test platform, containing a set of test
    names."""
    rv = {}
    for test_platform, cfg in test_platforms.items():
        test_sets = cfg["test-sets"]
        if not set(test_sets) <= set(test_sets_cfg):
            raise Exception(
                "Test sets {} for test platform {} are not defined".format(
                    ", ".join(test_sets), test_platform
                )
            )
        test_names = set()
        for test_set in test_sets:
            for test_name in test_sets_cfg[test_set]:
                # test_sets contains groups of test suites that we commonly
                # run together. these tests are defined across more than one
                # `kind`, which means we may only have a subset of them when
                # this is called for any given kind. any tests that are
                # relevant to the given kind will be included; all others will
                # be skipped over.
                if is_test_for_kind(test_name, kind):
                    test_names.add(test_name)
        rv[test_platform] = cfg.copy()
        rv[test_platform]["test-names"] = test_names
    return rv
