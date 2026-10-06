import mozunit

LINTER = "trojan-source"


def test_lint_trojan_source(lint, paths):
    results = lint(paths())
    print(results)
    assert len(results) == 5

    assert "disallowed characters" in results[0].message
    assert results[0].level == "error"
    assert "commenting-out.cpp" in results[0].relpath
    assert results[0].lineno == 5

    assert "disallowed characters" in results[1].message
    assert results[1].level == "error"
    assert "commenting-out.cpp" in results[1].relpath
    assert results[1].lineno == 7

    assert "disallowed characters" in results[2].message
    assert results[2].level == "error"
    assert "early-return.py" in results[2].relpath
    assert results[2].lineno == 5

    assert "disallowed characters" in results[3].message
    assert results[3].level == "error"
    assert "invisible-function.rs" in results[3].relpath
    assert results[3].lineno == 5

    assert "disallowed characters" in results[4].message
    assert results[4].level == "error"
    assert "invisible-function.rs" in results[4].relpath
    assert results[4].lineno == 10


if __name__ == "__main__":
    mozunit.main()
