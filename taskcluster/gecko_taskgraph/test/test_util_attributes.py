# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


import unittest

import pytest
from mozunit import main

from gecko_taskgraph.util.attributes import (
    match_run_on_projects,
    match_run_on_repo_type,
    release_level,
)


class MatchRunOnProjects(unittest.TestCase):
    def test_empty(self):
        self.assertFalse(match_run_on_projects({"project": "birch"}, []))

    def test_all(self):
        self.assertTrue(match_run_on_projects({"project": "birch"}, ["all"]))
        self.assertTrue(match_run_on_projects({"project": "larch"}, ["all"]))
        self.assertTrue(match_run_on_projects({"project": "autoland"}, ["all"]))
        self.assertTrue(match_run_on_projects({"project": "mozilla-central"}, ["all"]))
        self.assertTrue(match_run_on_projects({"project": "mozilla-beta"}, ["all"]))
        self.assertTrue(match_run_on_projects({"project": "mozilla-release"}, ["all"]))

    def test_release(self):
        self.assertFalse(
            match_run_on_projects({"project": "birch", "level": "3"}, ["release"])
        )
        self.assertTrue(
            match_run_on_projects({"project": "larch", "level": "3"}, ["release"])
        )
        self.assertFalse(
            match_run_on_projects({"project": "autoland", "level": "3"}, ["release"])
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-central", "level": "3"}, ["release"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-beta", "level": "3"}, ["release"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-release", "level": "3"}, ["release"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "firefox", "level": "3", "head_ref": "refs/heads/main"},
                ["release"],
            )
        )
        self.assertFalse(
            match_run_on_projects(
                {"project": "firefox", "level": "1", "head_ref": "refs/heads/main"},
                ["release"],
            )
        )

    def test_integration(self):
        self.assertFalse(match_run_on_projects({"project": "birch"}, ["integration"]))
        self.assertFalse(match_run_on_projects({"project": "larch"}, ["integration"]))
        self.assertTrue(match_run_on_projects({"project": "autoland"}, ["integration"]))
        self.assertFalse(
            match_run_on_projects({"project": "mozilla-central"}, ["integration"])
        )
        self.assertFalse(
            match_run_on_projects({"project": "mozilla-beta"}, ["integration"])
        )
        self.assertFalse(
            match_run_on_projects({"project": "mozilla-integration"}, ["integration"])
        )

    def test_combo(self):
        self.assertTrue(
            match_run_on_projects(
                {"project": "birch", "level": "3"}, ["release", "birch", "maple"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "larch", "level": "3"}, ["release", "birch", "maple"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "maple", "level": "3"}, ["release", "birch", "maple"]
            )
        )
        self.assertFalse(
            match_run_on_projects(
                {"project": "autoland", "level": "3"}, ["release", "birch", "maple"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-central", "level": "3"},
                ["release", "birch", "maple"],
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-beta", "level": "3"}, ["release", "birch", "maple"]
            )
        )
        self.assertTrue(
            match_run_on_projects(
                {"project": "mozilla-release", "level": "3"},
                ["release", "birch", "maple"],
            )
        )
        self.assertTrue(match_run_on_projects({"project": "birch"}, ["birch", "trunk"]))


@pytest.mark.parametrize(
    "repo_type,run_on_repo_types,expected",
    (
        ("hg", ["hg"], True),
        ("hg", [], False),
        ("hg", ["all"], True),
        ("git", ["git", "hg"], True),
        ("git", ["hg"], False),
    ),
)
def test_match_run_on_repo_type(repo_type, run_on_repo_types, expected):
    assert match_run_on_repo_type(repo_type, run_on_repo_types) == expected


@pytest.mark.parametrize(
    "params,expected",
    (
        ({"project": "autoland", "level": "3"}, "staging"),
        ({"project": "mozilla-central", "level": "3"}, "production"),
        (
            {"project": "firefox", "level": "3", "head_ref": "refs/heads/test"},
            "staging",
        ),
        ({"project": "firefox", "level": "3", "head_ref": "refs/tags/beta"}, "staging"),
        (
            {"project": "firefox", "level": "3", "head_ref": "refs/heads/beta"},
            "production",
        ),
        (
            {"project": "firefox", "level": "1", "head_ref": "refs/heads/beta"},
            "staging",
        ),
    ),
)
def test_release_level(params, expected):
    assert release_level(params) == expected


if __name__ == "__main__":
    main()
