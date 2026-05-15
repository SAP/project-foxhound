#!/usr/bin/env python

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import os

import mozunit
import pytest
from manifestparser import ManifestParser
from manifestparser.toml import (
    DEFAULT_SECTION,
    Carry,
    Mode,
    add_skip_if,
    alphabetize_toml_str,
    replace_tbd_skip_if,
)
from tomlkit.toml_document import TOMLDocument

here = os.path.dirname(os.path.abspath(__file__))


def test_add_skip_if(tmp_path):
    parser = ManifestParser(use_toml=True, document=True)
    filename = "aaa.js"
    contents = f'[{DEFAULT_SECTION}]\n\n["{filename}"]'
    manifest_path = tmp_path / "add_skip_if.toml"
    manifest_path.write_text(contents)
    parser.read(str(manifest_path))
    document = parser.source_documents[str(manifest_path)]
    assert DEFAULT_SECTION in document
    skip_if = "true"
    bug_reference = "Bug 2003869"
    additional_comment, carryover, bug_reference = add_skip_if(
        document,
        filename,
        skip_if,
        bug_reference,
        None,
        Mode.NORMAL,
    )
    assert bug_reference is not None  # skip-if should not be ignored
    manifest_str = alphabetize_toml_str(document)
    assert (
        manifest_str
        == """[DEFAULT]

["aaa.js"]
skip-if = [
  "true", # Bug 2003869
]
"""
    )


def test_replace_tbd_skip_if():
    parser = ManifestParser(use_toml=True, document=True)
    before = "replace-tbd-before.toml"
    before_path = os.path.join(here, before)
    parser.read(before_path)
    assert before_path in parser.source_documents
    manifest = parser.source_documents[before_path]
    assert manifest is not None
    assert isinstance(manifest, TOMLDocument)

    filename = "non-existant.js"
    condition = "os == 'android' && asan"
    bugid = "100"
    updated: bool = False
    with pytest.raises(Exception) as e:
        updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
        assert updated  # Fail here if no exception thrown
    assert str(e.value) == "TOML manifest does not contain section: non-existant.js"
    filename = "DEFAULT"
    with pytest.raises(Exception) as e:
        updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
        assert updated  # Fail here if no exception thrown
    assert (
        str(e.value)
        == "TOML manifest for section: DEFAULT does not contain a skip-if condition"
    )

    filename = "bug_100.js"
    updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
    assert updated

    filename = "bug_3.js"
    condition = "os == 'linux'"
    bugid = "33333"
    updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
    assert updated

    filename = "test_bar.html"
    condition = "os == 'linux'"
    bugid = "222"
    updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
    assert updated

    filename = "test_extend_linux.js"
    condition = "os == 'mac'"
    bugid = "111"
    updated = replace_tbd_skip_if(manifest, filename, condition, bugid)
    assert updated

    manifest_str = alphabetize_toml_str(manifest)
    after = "replace-tbd-after.toml"
    after_path = os.path.join(here, after)
    after_str = open(after_path, encoding="utf-8").read()
    assert manifest_str == after_str


@pytest.fixture(scope="session")
def carry():
    c = Carry()
    yield c


@pytest.mark.parametrize(
    "test_index, e_condition, condition, expected",  # test_index for convenience
    [
        (
            1,
            "os == 'android' && processor == 'x86_64'",
            "os == 'android' && os_version == '14' && processor == 'x86_64'",
            True,
        ),
        (
            2,
            "http3",
            "os == 'linux' && os_version == '24.04' && processor == 'x86_64' && display == 'x11' && xorigin",
            False,
        ),
        (
            3,
            "http3",
            "os == 'linux' && os_version == '24.04' && processor == 'x86_64' && display == 'x11' && xorigin && debug",
            False,
        ),
        (
            4,
            "os == 'android' && debug",
            "os == 'android' && os_version == '14' && debug",
            True,
        ),
        (
            5,
            "os == 'android' && !debug",
            "os == 'android' && os_version == '14' && debug",
            False,
        ),
        (
            6,
            "os == 'android' && debug",
            "os == 'android' && os_version == '14' && !debug",
            False,
        ),
        (
            7,
            "os == 'android'",
            "os == 'android' && os_version == '14' && debug",
            True,
        ),
        (
            8,
            "os == 'android'",
            "os == 'android' && os_version == '14' && !debug",
            True,
        ),
        (
            9,
            "os == 'android' && debug",
            "os == 'android' && os_version == '14'",
            False,
        ),
        (
            10,
            "os == 'android' && !debug",
            "os == 'android' && os_version == '14'",
            False,
        ),
        (
            11,
            "os == 'android' && asan",
            "os == 'android' && os_version == '14' && ccov",
            True,
        ),
        (
            12,
            "os == 'android'",
            "os == 'android' && os_version == '14' && ccov",
            True,
        ),
        (
            13,
            "os == 'android' && tsan",
            "os == 'android' && os_version == '14'",
            False,
        ),
        (
            14,
            "os == 'linux' && debug && socketprocess_networking",
            "os == 'android' && debug",
            False,
        ),
        (15, "debug && socketprocess_networking", "os == 'android' && debug", True),
        (16, "os == 'linux'", "verify", False),
        (17, "os == 'win'", "tsan", False),
        (
            18,
            "os == 'linux' && os_version == '22.04' && debug",
            "os == 'linux' && os_version == '24.04' && asan && isolated_debug_process",
            False,
        ),
        (
            19,
            "os == 'linux' && os_version == '22.04' && isolated_debug_process",
            "os == 'linux' && os_version == '24.04' && opt",
            True,
        ),
        (
            20,
            "os == 'android' && opt",
            "os == 'android' && os_version == '14' && !debug",
            True,
        ),
        (
            21,
            "os == 'android' && !debug",
            "os == 'android' && os_version == '14' && opt",
            True,
        ),
        (
            22,
            "!opt",
            "!opt",
            True,
        ),
        (
            23,
            "!opt",
            "asan",
            True,
        ),
        (
            24,
            "ccov",
            "!opt",
            True,
        ),
        (
            25,
            "debug",
            "tsan",
            False,
        ),
        (
            26,
            "ccov",
            "debug",
            False,
        ),
    ],
)
def test_platform_match_for_carryover(
    carry: Carry, test_index: int, e_condition: str, condition: str, expected: bool
):
    """
    Verify TOML function _condition_is_carryover platform match heuristic
    """
    assert test_index == carry.test_index()  # help maintain order
    assert carry.is_carryover(e_condition, condition) == expected


if __name__ == "__main__":
    mozunit.main()
