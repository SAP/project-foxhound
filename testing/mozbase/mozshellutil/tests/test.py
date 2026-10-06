#!/usr/bin/env python
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this file,
# You can obtain one at http://mozilla.org/MPL/2.0/.

import mozunit
import pytest
from mozshellutil import MetaCharacterException, quote, split


def test_quote_simple():
    assert quote("a", "b") == "a b"


def test_quote_with_spaces():
    assert quote("a b", "c") == "'a b' c"


def test_quote_empty_string():
    assert quote("") == "''"


def test_quote_single_quote():
    assert quote("a'b") == "'a'\\''b'"


def test_quote_with_special_chars():
    result = quote("a$b")
    assert result == "'a$b'"


def test_quote_int():
    assert quote(123) == "123"


def test_split_simple():
    assert split("a b c") == ["a", "b", "c"]


def test_split_quoted():
    assert split("'a b' c") == ["a b", "c"]


def test_split_double_quoted():
    assert split('"a b" c') == ["a b", "c"]


def test_split_escaped():
    assert split(r"a\ b c") == ["a b", "c"]


def test_split_with_comment():
    assert split("a b # comment") == ["a", "b"]


def test_split_metacharacter_exception():
    with pytest.raises(MetaCharacterException) as exc_info:
        split("a | b")
    assert exc_info.value.char == "|"


def test_split_escaped_newlines():
    assert split("a\\\nb") == ["ab"]


if __name__ == "__main__":
    mozunit.main()
