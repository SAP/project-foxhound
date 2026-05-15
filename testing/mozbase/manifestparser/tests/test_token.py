#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import mozunit
import pytest
from manifestparser.token import ManifestTokens, strip_unquoted


class Index:
    def __init__(self):
        self.index = 1
        self._manifest_tokens = ManifestTokens()

    def expected(self):
        self.index += 1
        return self.index - 1

    def manifest_tokens(self):
        return self._manifest_tokens


def test_strip_unquoted():
    assert strip_unquoted("") == ""
    assert strip_unquoted(" http3 ") == "http3"
    assert strip_unquoted("os  ==  'linux'") == "os == 'linux'"
    assert strip_unquoted(" os  ==  'Plucky Puffin' ") == "os == 'Plucky Puffin'"


@pytest.fixture(scope="session")
def index():
    yield Index()


@pytest.mark.parametrize(
    "test_index, condition, msg",
    [
        (
            1,
            "",
            "empty condition",
        ),
        (
            2,
            "http3",
            "",
        ),
        (
            3,
            "http2 http3",
            "expected each operation to be an single variable or comparison",
        ),
        (
            4,
            "os <= 'android'",
            "unknown comparison operator '<=' in comparison: os <= 'android'",
        ),
        (
            5,
            "release == 'Plucky Puffin'",
            "unknown var 'release' in comparison: release == 'Plucky Puffin'",
        ),
        (
            6,
            "os == 'Plucky Puffin'",
            "unknown value 'Plucky Puffin' in comparison: os == 'Plucky Puffin'",
        ),
        (
            7,
            "  os ==  'android'   &&    arch == 'x86_64'  ",
            "",
        ),
        (
            8,
            "os_version == '22.04' && os == 'linux'",
            "variable os (rank 1) should appear before variable os_version (rank 2) in condition: os_version == '22.04' && os == 'linux'",
        ),
        (
            9,
            "os_version == '22.04' && os != 'linux'",
            "value 22.04 depends on os == 'linux' in condition: os_version == '22.04' && os != 'linux'",
        ),
        (
            10,
            "os_version <= '24.04'",
            "unknown comparison operator '<=' in comparison: os_version <= '24.04'",
        ),
        (
            11,
            "os == 'android' && os_version == '22.04'",
            "value 22.04 depends on os == 'linux' in condition: os == 'android' && os_version == '22.04'",
        ),
    ],
)
def test_canonical_condition(index: Index, test_index: int, condition: str, msg: str):
    assert test_index == index.expected()
    test_msg = index.manifest_tokens().canonical_condition(condition)
    assert test_msg == msg


if __name__ == "__main__":
    mozunit.main()
