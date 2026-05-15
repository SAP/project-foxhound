import mozunit

LINTER = "gecko-trace"


def test_lint_unregistered_files(lint, create_temp_file):
    """
    Test that the linter runs without errors on a valid file.
    """

    path = create_temp_file("", "gecko-trace.yml")
    results = lint([path])

    assert len(results) == 1
    assert "not registered" in results[0].message


if __name__ == "__main__":
    mozunit.main()
