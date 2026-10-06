# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import mozunit

LINTER = "glean-parser"


def test_lint_glean_parser_good(lint, paths):
    """Test that good metrics.yaml files pass validation."""
    results = lint(paths("good/"))

    assert len(results) == 0


def test_lint_glean_parser_bad(lint, paths):
    """Test that bad metrics.yaml files are caught by the linter."""
    results = lint(paths("bad/"))

    # Should have exactly 2 errors: one for empty data_reviews, one for TODO data_reviews
    assert len(results) == 2

    # All results should be errors
    for r in results:
        assert r.level == "error"
        assert "bad/metrics.yaml" in r.relpath

    # Check that we get the expected error messages
    messages = [r.message for r in results]

    # Should have errors about empty data reviews
    empty_data_review_errors = [msg for msg in messages if "EMPTY_DATAREVIEW" in msg]
    assert len(empty_data_review_errors) == 2

    # Check specific metric names are mentioned
    assert any("empty_data_review" in msg for msg in messages)
    assert any("todo_data_review" in msg for msg in messages)


if __name__ == "__main__":
    mozunit.main()
