import mozunit

LINTER = "wpt-subsuite-tagging"


def test_dir_tag_passes(lint, paths):
    results = lint(paths("testing/web-platform/tests/with-dir-tag/webgpu/test.html"))
    assert len(results) == 0


def test_file_tag_passes(lint, paths):
    results = lint(paths("testing/web-platform/tests/with-file-tag/webgpu/test.html"))
    assert len(results) == 0


def test_variant_tag_passes(lint, paths):
    results = lint(
        paths("testing/web-platform/tests/with-variant-tag/webgpu/test.html")
    )
    assert len(results) == 0


def test_untagged_errors(lint, paths):
    results = lint(paths("testing/web-platform/tests/untagged/webgpu/test.html"))
    assert len(results) == 1
    assert "webgpu" in results[0].message


def test_not_subsuite_passes(lint, paths):
    results = lint(paths("testing/web-platform/tests/not-subsuite/test.html"))
    assert len(results) == 0


def test_mozilla_tagged_passes(lint, paths):
    results = lint(paths("testing/web-platform/mozilla/tests/html/canvas/tagged.html"))
    assert len(results) == 0


def test_mozilla_untagged_errors(lint, paths):
    results = lint(
        paths("testing/web-platform/mozilla/tests/html/canvas/untagged.html")
    )
    assert len(results) == 1
    assert "canvas" in results[0].message


if __name__ == "__main__":
    mozunit.main()
