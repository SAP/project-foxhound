import os
import re

import mozunit
import yaml

LINTER = "includes"

topsrcdir = os.path.join(os.path.dirname(__file__), "..", "..", "..")
api_yaml = os.path.join(topsrcdir, "mfbt", "api.yml")
assert os.path.exists(api_yaml), f"includes linter configuration missing in {api_yaml}"


def check_symbols_unicity(symbols):
    sorted_symbols = sorted(symbols)
    sorted_symbols_set = sorted(set(symbols))
    if sorted_symbols != sorted_symbols_set:
        # Not the most efficient implementation, but it rarely happens and it's readable.
        duplicates = [x for x in sorted_symbols_set if sorted_symbols.count(x) > 1]
        raise AssertionError(
            f"symbol{'s' if len(duplicates) > 1 else ''} listed more than once: {', '.join(duplicates)}"
        )


def test_lint_api_yml(lint):

    with open(api_yaml) as fd:
        description = yaml.safe_load(fd)

    category_re = {
        "variables": r"\b{}\b",
        "functions": r"\b{}\b",
        "macros": r"\b{}\b",
        "types": r"\b{}\b",
        "literal": r'\boperator""{}\b',
    }

    # Ensure all listed file exist and contain the described symbols
    mfbt_dir = os.path.join(topsrcdir, "mfbt")
    for header, categories in description.items():
        header_path = os.path.join(mfbt_dir, header)
        assert os.path.exists(header_path), (
            f"{header} described in {api_yaml}, but missing in mfbt/"
        )

        with open(header_path) as fd:
            header_content = fd.read()

        # NOTE: This detects removal of symbols in mfbt/* not reflected in
        # api.yml, but not addition of symbols.
        for category in ("variables", "functions", "macros", "types", "literal"):
            symbols = categories.get(category, [])
            check_symbols_unicity(symbols)
            for symbol in symbols:
                symbol_found = re.search(
                    category_re[category].format(symbol), header_content
                )
                assert symbol_found, (
                    f"{symbol} described as a {category} available in {header}, but cannot be found there"
                )


def test_lint_mfbt_includes(lint, paths):
    results = lint(paths("correct_assert.h"))
    assert not results

    results = lint(paths("incorrect_assert.h"))
    assert len(results) == 1
    assert results[0].message.endswith(
        "incorrect_assert.h includes Assertions.h but does not reference any of its API"
    )

    results = lint(paths("correct_literal.h"))
    assert not results

    results = lint(paths("incorrect_literal.h"))
    assert len(results) == 1
    assert results[0].message.endswith(
        "incorrect_literal.h includes Literals.h but does not reference any of its API"
    )


def test_lint_std_includes(lint, paths):
    results = lint(paths("correct_tuple.h"))
    assert not results

    results = lint(paths("incorrect_tuple.h"))
    assert len(results) == 1
    assert results[0].message.endswith(
        "incorrect_tuple.h includes <tuple> but does not reference any of its API"
    )


def test_lint_c_std_includes(lint, paths):
    results = lint(paths("correct_stdio.h"))
    assert not results

    results = lint(paths("correct_cstdio.h"))
    assert not results

    results = lint(paths("incorrect_stdio.h"))
    assert len(results) == 1
    assert results[0].message.endswith(
        "incorrect_stdio.h includes <stdio.h> but does not reference any of its API"
    )

    results = lint(paths("incorrect_cstdio.h"))
    assert len(results) == 1
    assert results[0].message.endswith(
        "incorrect_cstdio.h includes <cstdio> but does not reference any of its API"
    )


if __name__ == "__main__":
    mozunit.main()
