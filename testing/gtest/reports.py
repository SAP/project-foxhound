# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, # You can obtain one at http://mozilla.org/MPL/2.0/.

import functools
import itertools
import json
import os
import sys
import tempfile
from os import path

_EMPTY_REPORT = {
    "tests": 0,
    "failures": 0,
    "disabled": 0,
    "errors": 0,
    "testsuites": {},
}


def merge_gtest_reports(test_reports):
    """
    Logically merges json test reports matching [this
    schema](https://google.github.io/googletest/advanced.html#generating-a-json-report).

    It is assumed that each test will appear in at most one report (rather than
    trying to search and merge each test).

    Arguments:
    * test_reports - an iterator of python-native data (likely loaded from GTest JSON files).
    """
    INTEGER_FIELDS = ["tests", "failures", "disabled", "errors"]
    TESTSUITE_INTEGER_FIELDS = ["tests", "failures", "disabled"]

    def merge_testsuite(target, suite):
        for field in TESTSUITE_INTEGER_FIELDS:
            if field in suite:
                target[field] += suite[field]
        # We assume that each test will appear in at most one report,
        # so just extend the list of tests.
        target["testsuite"].extend(suite["testsuite"])

    def merge_one(current, report):
        for field in INTEGER_FIELDS:
            if field in report:
                current[field] += report[field]
        for suite in report["testsuites"]:
            name = suite["name"]
            if name in current["testsuites"]:
                merge_testsuite(current["testsuites"][name], suite)
            else:
                current["testsuites"][name] = suite
                for field in TESTSUITE_INTEGER_FIELDS:
                    current["testsuites"][name].setdefault(field, 0)
        return current

    merged = functools.reduce(merge_one, test_reports, _EMPTY_REPORT)
    # We had testsuites as a dict for fast lookup when merging, change
    # it back to a list to match the schema.
    merged["testsuites"] = list(merged["testsuites"].values())

    return merged


class AggregatedGTestReport(dict):
    """
    An aggregated gtest report (stored as a `dict`)

    This should be used as a context manager to manage the lifetime of
    temporary storage for reports. If no exception occurs, when the context
    exits the reports will be merged into this dictionary. Thus, the context
    must not be exited before the outputs are written (e.g., by gtest processes
    completing).

    When merging results, it is assumed that each test will appear in at most
    one report (rather than trying to search and merge each test).
    """

    __slots__ = ["result_dir"]

    def __init__(self):
        tmpdir_kwargs = {}
        if sys.version_info >= (3, 10):
            tmpdir_kwargs["ignore_cleanup_errors"] = True
        self.result_dir = tempfile.TemporaryDirectory(**tmpdir_kwargs)
        super().__init__()
        self.reset()

    def __enter__(self):
        self.result_dir.__enter__()
        return self

    def __exit__(self, *exc_info):
        # Only collect reports if no exception occurred
        if exc_info[0] is None:
            d = self.result_dir.name
            result_files = filter(
                path.isfile, map(lambda f: path.join(d, f), os.listdir(d))
            )

            def json_from_file(file):
                with open(file) as f:
                    return json.load(f)

            self.update(
                merge_gtest_reports(
                    itertools.chain([self], map(json_from_file, result_files))
                )
            )
        self.result_dir.__exit__(*exc_info)

    def reset(self):
        """Clear all results."""
        self.clear()
        self.update({
            "tests": 0,
            "failures": 0,
            "disabled": 0,
            "errors": 0,
            "testsuites": [],
        })

    def gtest_output(self, job_id):
        """
        Create a gtest output string with the given job id (to differentiate
        outputs).
        """
        # Replace `/` with `_` in job_id to prevent nested directories (job_id
        # may be a suite name, which may have slashes for parameterized test
        # suites).
        return f"json:{self.result_dir.name}/{job_id.replace('/', '_')}.json"

    def set_output_in_env(self, env, job_id):
        """
        Sets an environment variable mapping appropriate with the output for
        the given job id.

        Returns the env.
        """
        env["GTEST_OUTPUT"] = self.gtest_output(job_id)
        return env
