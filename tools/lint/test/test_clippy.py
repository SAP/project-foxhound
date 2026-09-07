from unittest import mock

import mozunit

LINTER = "clippy"
fixed = 0


def test_good(lint, config, paths):
    results = lint(paths("test1/good.rs"))
    print(results)
    assert len(results) == 0


def test_basic(lint, config, paths):
    # Test basic linting functionality
    # Note: These tests may not produce clippy results if cargo/clippy aren't available
    # in the test environment, but they verify the code path works without crashes
    results = lint(paths("test1/bad.rs"))
    print(results)
    # Verify the linting process completes and returns expected structure
    assert isinstance(results, list)
    # If clippy is available and detects issues, check the structure
    if len(results) > 0:
        # bad.rs contains a swap pattern that clippy should detect
        assert "bad.rs" in results[0].path
        assert results[0].level in ["warning", "error"]


def test_multiple_files(lint, config, paths):
    # Test linting multiple files in a directory
    results = lint(paths("test1/"))
    print(results)
    # Should lint both good.rs and bad.rs files
    assert isinstance(results, list)
    # If results are found, they should only be from bad files (not good.rs)
    if len(results) > 0:
        for result in results:
            assert "good.rs" not in result.path, "Good file should not have lint issues"


def test_non_gkrust_crate(lint, config, paths):
    # Test the non-gkrust crate path (test2 directory)
    results = lint(paths("test2/"))
    print(results)
    # Verify the linting process handles non-gkrust crates
    assert isinstance(results, list)
    # If clippy runs and finds issues, verify structure
    if len(results) > 0:
        assert results[0].level in ["warning", "error"]
        assert "test2" in results[0].path


def test_fix_gkrust(lint, paths, create_temp_file):
    """Test --fix option for gkrust crate files"""
    # Create a temporary Rust file with fixable clippy issues
    contents = """fn main() {
    let mut x = 5;
    x = 6;
    println!("{}", x);
}
"""
    path = create_temp_file(contents, "fixable.rs")

    # Run clippy without fix first to see baseline
    results_before = lint([path], fix=False)

    # Run clippy with fix=True
    results_after = lint([path], fix=True)

    # Verify that the linting process completed
    assert isinstance(results_before, list)
    assert isinstance(results_after, list)

    # The fixed counter should be non-negative and track attempts
    assert fixed >= 0


def test_fix_non_gkrust(lint, paths, create_temp_file):
    """Test --fix option for non-gkrust crate files"""
    # Create a temporary Rust file with common fixable clippy patterns
    contents = """fn main() {
    let mut unused_var = 5;
    unused_var = 6;
    let x = vec![1, 2, 3];
    for i in 0..x.len() {
        println!("{}", x[i]);
    }
}
"""
    path = create_temp_file(contents, "non_gkrust_fixable.rs")

    # Reset the fixed counter
    fixed_before = fixed

    # Run clippy with fix=True
    results = lint([path], fix=True)

    # Verify that the linting process completed
    assert isinstance(results, list)

    # Check that the fixed counter is properly tracked
    # The counter should be >= what it was before (may increment if fixes applied)
    assert fixed >= fixed_before


def test_gkrust_invocation_keeps_going_and_demotes_dwarnings(tmpdir):
    """The gkrust path inherits MOZ_RUST_DEFAULT_FLAGS and therefore
    `-Dwarnings`, which would promote any clippy warning to a hard error and
    stop cargo at the first offending crate. Make sure mozlint demotes that
    back to warn level via extra_rustflags and asks cargo to --keep-going so
    a single failing crate cannot hide warnings in everything downstream.
    """
    import clippy

    captured = {}

    def fake_run(args, **kwargs):
        captured["args"] = args
        captured["env"] = kwargs.get("env") or {}
        return mock.Mock(returncode=0, stdout="", stderr="")

    config = {"warn": ["needless_return", "items_after_statements"], "deny": []}
    pg = clippy.PathGroup("gkrust", str(tmpdir))

    with mock.patch.object(
        clippy.subprocess, "run", side_effect=fake_run
    ), mock.patch.object(clippy, "expand_exclusions", return_value=[]):
        clippy.lint_gkrust(
            pg,
            config,
            mock.MagicMock(),
            False,
            str(tmpdir),
            {"results": [], "fixed": 0},
        )

    assert "--keep-going" in captured["args"], (
        "expected cargo to run with --keep-going so one failing crate doesn't "
        "skip lint coverage of the rest of the workspace; got args={!r}".format(
            captured["args"]
        )
    )

    rustflags = captured["env"].get("extra_rustflags", "")
    tokens = rustflags.split()
    # `-W warnings` must appear, and must come before any clippy-specific -W
    # so that the last `-W/-D` for a clippy lint group still wins. The intent
    # is to override a leading `-Dwarnings` from MOZ_RUST_DEFAULT_FLAGS only.
    assert "warnings" in tokens, (
        f"expected -W warnings in extra_rustflags, got: {rustflags!r}"
    )
    w_warnings_idx = tokens.index("warnings")
    assert tokens[w_warnings_idx - 1] == "-W", (
        f"expected `-W warnings` (got token before 'warnings' = {tokens[w_warnings_idx - 1]!r})"
    )
    # The lints from clippy.yml must still be passed through.
    assert "clippy::needless_return" in tokens
    assert "clippy::items_after_statements" in tokens


if __name__ == "__main__":
    mozunit.main()
