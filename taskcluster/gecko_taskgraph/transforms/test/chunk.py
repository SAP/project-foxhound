# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import taskgraph
from taskgraph.transforms.base import TransformSequence
from taskgraph.util import json
from taskgraph.util.copy import deepcopy
from taskgraph.util.treeherder import join_symbol, split_symbol

from gecko_taskgraph.util.chunking import (
    WPT_SUBSUITES,
    chunk_manifests,
    get_manifest_loader,
    get_runtimes,
    get_test_tags,
    guess_mozinfo_from_task,
    resolve_manifest_runtimes,
)
from gecko_taskgraph.util.perfile import perfile_number_of_chunks

DYNAMIC_CHUNK_DURATION = 20 * 60  # seconds
"""The approximate time each test chunk should take to run."""


transforms = TransformSequence()


@transforms.add
def set_test_verify_chunks(config, tasks):
    """Set the number of chunks we use for test-verify."""
    for task in tasks:
        if any(task["suite"].startswith(s) for s in ("test-verify", "test-coverage")):
            env = config.params.get("try_task_config", {}) or {}
            env = env.get("templates", {}).get("env", {})
            task["chunks"] = perfile_number_of_chunks(
                config.params["try_mode"] is not None,
                env.get("MOZHARNESS_TEST_PATHS", ""),
                frozenset(config.params["files_changed"]),
                task["test-name"],
            )

            # limit the number of chunks we run for test-verify mode because
            # test-verify is comprehensive and takes a lot of time, if we have
            # >30 tests changed, this is probably an import of external tests,
            # or a patch renaming/moving files in bulk
            maximum_number_verify_chunks = 3
            task["chunks"] = min(task["chunks"], maximum_number_verify_chunks)

        yield task


@transforms.add
def set_test_manifests(config, tasks):
    """Determine the set of test manifests that should run in this task."""

    for task in tasks:
        # When a task explicitly requests no 'test_manifest_loader', test
        # resolving will happen at test runtime rather than in the taskgraph.
        if "test-manifest-loader" in task and task["test-manifest-loader"] is None:
            yield task
            continue

        # Set 'tests_grouped' to "1", so we can differentiate between suites that are
        # chunked at the test runtime and those that are chunked in the taskgraph.
        task.setdefault("tags", {})["tests_grouped"] = "1"

        if taskgraph.fast:
            # We want to avoid evaluating manifests when taskgraph.fast is set. But
            # manifests are required for dynamic chunking. Just set the number of
            # chunks to one in this case.
            if task["chunks"] == "dynamic":
                task["chunks"] = task.get("default-chunks", 1)
            yield task
            continue

        manifests = task.get("test-manifests")
        if manifests:
            if isinstance(manifests, list):
                task["test-manifests"] = {"active": manifests, "skipped": []}
            yield task
            continue

        mozinfo = guess_mozinfo_from_task(
            task,
            config.params.get("head_repository", ""),
            config.params.get("app_version", ""),
            get_test_tags(config, task.get("worker", {}).get("env", {})),
        )

        loader_name = task.pop(
            "test-manifest-loader", config.params["test_manifest_loader"]
        )
        loader = get_manifest_loader(loader_name, config.params)

        task["test-manifests"] = loader.get_manifests(
            task["suite"],
            frozenset(mozinfo.items()),
        )

        # When scheduling with test paths, we often find manifests scheduled but all tests
        # are skipped on a given config.  This will remove the task from the task set if
        # no manifests have active tests for the given task/config
        mh_test_paths = {}
        if "MOZHARNESS_TEST_PATHS" in config.params.get("try_task_config", {}).get(
            "env", {}
        ):
            mh_test_paths = json.loads(
                config.params["try_task_config"]["env"]["MOZHARNESS_TEST_PATHS"]
            )

        if (
            mh_test_paths
            and task["attributes"]["unittest_suite"] in mh_test_paths.keys()
        ):
            input_paths = mh_test_paths[task["attributes"]["unittest_suite"]]
            remaining_manifests = []

            # if we have web-platform tests incoming, just yield task
            found_wpt = False
            for m in input_paths:
                if m.startswith("testing/web-platform/tests/"):
                    found_subsuite = [
                        key for key in WPT_SUBSUITES if key in task["test-name"]
                    ]
                    if found_subsuite:
                        if any(
                            test_subsuite in m
                            for test_subsuite in WPT_SUBSUITES[found_subsuite[0]]
                        ):
                            yield task
                    else:
                        yield task
                    found_wpt = True
                    break
            if found_wpt:
                continue

            # input paths can exist in other directories (i.e. [../../dir/test.js])
            # we need to look for all [active] manifests that include tests in the path
            for m in input_paths:
                if [tm for tm in task["test-manifests"]["active"] if tm.startswith(m)]:
                    remaining_manifests.append(m)

            # look in the 'other' manifests
            for m in input_paths:
                man = m
                for tm in task["test-manifests"]["other_dirs"]:
                    matched_dirs = [
                        dp
                        for dp in task["test-manifests"]["other_dirs"].get(tm)
                        if dp.startswith(man)
                    ]
                    if matched_dirs:
                        if tm not in task["test-manifests"]["active"]:
                            continue
                        if m not in remaining_manifests:
                            remaining_manifests.append(m)

            if remaining_manifests == []:
                continue

        elif mh_test_paths:
            # we have test paths and they are not related to the test suite
            # this could be the test suite doesn't support test paths
            continue
        elif (
            get_test_tags(config, task.get("worker", {}).get("env", {}))
            and not task["test-manifests"]["active"]
            and not task["test-manifests"]["other_dirs"]
        ):
            # no MH_TEST_PATHS, but MH_TEST_TAG or other filters
            continue

        yield task


@transforms.add
def resolve_dynamic_chunks(config, tasks):
    """Determine how many chunks are needed to handle the given set of manifests."""

    for task in tasks:
        if task["chunks"] != "dynamic":
            yield task
            continue

        if not task.get("test-manifests"):
            task["chunks"] = task.get("default-chunks", 1)
            yield task
            continue

        suite_name = task["test-name"] + task.get("variant-suffix", "")
        all_runtimes = get_runtimes(task["test-platform"], suite_name)

        runtimes = resolve_manifest_runtimes(
            all_runtimes, task["test-manifests"]["active"]
        )

        if not all_runtimes:
            task["chunks"] = task.get("default-chunks", 1)
            yield task
            continue

        # Truncate runtimes that are above the desired chunk duration. They
        # will be assigned to a chunk on their own and the excess duration
        # shouldn't cause additional chunks to be needed.
        times = [min(DYNAMIC_CHUNK_DURATION, r) for r in runtimes.values()]
        avg = round(sum(times) / len(times), 2) if times else 0
        total = sum(times)

        # If there are manifests missing from the runtimes data, fill them in
        # with the average of all present manifests.
        missing = [m for m in task["test-manifests"]["active"] if m not in runtimes]
        total += avg * len(missing)

        chunks = int(round(total / DYNAMIC_CHUNK_DURATION))

        # Make sure we never exceed the number of manifests, nor have a chunk
        # length of 0.
        task["chunks"] = min(chunks, len(task["test-manifests"]["active"])) or 1
        yield task


@transforms.add
def split_chunks(config, tasks):
    """Based on the 'chunks' key, split tests up into chunks by duplicating
    them and assigning 'this-chunk' appropriately and updating the treeherder
    symbol.
    """

    for task in tasks:
        # If test-manifests are set, chunk them ahead of time to avoid running
        # the algorithm more than once.
        chunked_manifests = None
        if "test-manifests" in task:
            # TODO: hardcoded to "2", ideally this should be centralized somewhere
            if (
                config.params["try_task_config"].get("new-test-config", False)
                and task["chunks"] > 1
            ):
                task["chunks"] *= 2
                task["max-run-time"] = int(task["max-run-time"] * 2)

            manifests = task["test-manifests"]
            suite_name = task["test-name"] + task.get("variant-suffix", "")
            chunked_manifests = chunk_manifests(
                suite_name,
                task["test-platform"],
                task["chunks"],
                manifests["active"],
            )

            # Add all skipped manifests to the first chunk of backstop pushes
            # so they still show up in the logs. They won't impact runtime much
            # and this way tools like ActiveData are still aware that they
            # exist.
            if (
                config.params["backstop"]
                and manifests["active"]
                and "skipped" in manifests
            ):
                chunked_manifests[0].extend([
                    m for m in manifests["skipped"] if not m.endswith(".list")
                ])
        last_chunk = task["chunks"]
        for i in range(task["chunks"]):
            this_chunk = i + 1

            # copy the test and update with the chunk number
            chunked = deepcopy(task) if this_chunk != last_chunk else task
            chunked["this-chunk"] = this_chunk

            if chunked_manifests is not None:
                chunked["test-manifests"] = sorted(chunked_manifests[i])

            group, symbol = split_symbol(chunked["treeherder-symbol"])
            if task["chunks"] > 1 or not symbol:
                # add the chunk number to the TH symbol
                symbol += str(this_chunk)
                chunked["treeherder-symbol"] = join_symbol(group, symbol)

            yield chunked
