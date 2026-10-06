# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, # You can obtain one at http://mozilla.org/MPL/2.0/.

import itertools
import os
import re
import subprocess


def get_gtest_suites(args, cwd, gtest_env):
    """
    Get a list of gtest suite names from a gtest program.

    * args - The arguments (including executable) for the gtest program.
    * cwd - The working directory to use.
    * gtest_env - Additional environment variables to set.

    Returns a list of the suite names.
    """
    # List the tests to get the suite names
    args.append("--gtest_list_tests")

    env = {}
    env.update(os.environ)
    env.update(gtest_env)
    completed_proc = subprocess.run(
        args, cwd=cwd, env=env, capture_output=True, check=True, text=True
    )
    output = completed_proc.stdout

    # Suite names are exclusively text without whitespace, and followed by
    # a '.', optionally with `  #` and type parameter information. This is
    # specific enough to reasonably filter out some extra strings output by
    # firefox.
    SUITE_REGEX = re.compile(r"(\S+).(  # .*)?")

    def get_suite_name(line):
        match = SUITE_REGEX.fullmatch(line)
        if match:
            return match[1]

    suites = list(
        filter(lambda x: x is not None, map(get_suite_name, output.splitlines()))
    )

    # Remove the `--gtest_list_tests` arg that we added
    args.pop()

    return suites


class _JoinedSubsetOfStrings:
    """
    Efficient creation of joined strings for subsets of a list of strings.

    This allows creation of joined strings in O(1) instead of O(n) each time (n = list
    length), with a one-time O(n) cost.
    """

    def __init__(self, between, strs):
        """
        Arguments:
        * between - the string with which to join the strings
        * strs - an iterable of strings
        """
        strs = list(strs)
        self._string = between.join(strs)
        betweenlen = len(between)
        self._offsets = list(
            itertools.accumulate(map(lambda s: len(s) + betweenlen, strs), initial=0)
        )

    def without(self, index):
        """Create a joined string excluding the given index."""
        return (
            self._string[: self._offsets[index]]
            + self._string[self._offsets[index + 1] :]
        )


class SuiteFilter:
    def __init__(self, joined, index, suite):
        self._joined = joined
        self.index = index
        self.suite = suite

    def create(self, existing_filter=None):
        """Create a filter to only run this suite."""
        if existing_filter is None or existing_filter == "*":
            return f"{self.suite}.*"
        else:
            return (
                existing_filter
                + (":" if "-" in existing_filter else "-")
                + self._joined.without(self.index)
            )

    def set_in_env(self, env):
        """
        Set the filter to only run this suite in an environment mapping.

        Returns the passed env.
        """
        env["GTEST_FILTER"] = self.create(env.get("GTEST_FILTER"))
        return env

    def __call__(self, val):
        """
        If called on a dict, creates a copy and forwards to `set_in_env`,
        otherwise forwards to `create`.
        """
        if isinstance(val, dict):
            return self.set_in_env(val.copy())
        else:
            return self.create(val)


def suite_filters(suites):
    """
    Form gtest filters to limit tests to a single suite.

    This is a generator that yields a SuiteFilter for each suite.

    Arguments:
    * suites - an iterable of the suite names
    """
    suites = list(suites)
    joined = _JoinedSubsetOfStrings(":", map(lambda s: f"{s}.*", suites))

    for i, suite in enumerate(suites):
        yield SuiteFilter(joined, i, suite)
