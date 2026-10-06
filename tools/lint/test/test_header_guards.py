import mozunit

LINTER = "header-guards"


def test_lint_header_guards(lint, paths):
    results = lint(paths("pragma_once.h"))
    assert not results

    results = lint(paths("ifndef.h"))
    assert not results

    results = lint(paths("ifnotdefined.h"))
    assert not results

    results = lint(paths("missing.h"))
    assert len(results) == 1
    assert "missing header guard" in results[0].message


if __name__ == "__main__":
    mozunit.main()
