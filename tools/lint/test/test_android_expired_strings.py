import mozunit

LINTER = "android-expired-strings"


def test_no_errors_on_clean_files(lint, paths):
    results = lint(
        paths(
            "mobile/android/fenix/app/src/main/java/Good.kt",
            "mobile/android/fenix/app/src/main/res/layout/good_layout.xml",
        )
    )
    assert len(results) == 0


def test_detects_r_string_reference(lint, paths):
    results = lint(paths("mobile/android/fenix/app/src/main/java/Bad.kt"))
    assert len(results) == 1
    assert "fenix_deprecated" in results[0].message
    assert "moz:removedIn=149" in results[0].message


def test_detects_at_string_reference_in_xml(lint, paths):
    results = lint(paths("mobile/android/fenix/app/src/main/res/layout/bad_layout.xml"))
    assert len(results) == 1
    assert "fenix_deprecated" in results[0].message
    assert results[0].lineno == 8


def test_detects_aliased_r_import(lint, paths):
    """exampleR.string.ac_deprecated should be caught because fenix can see
    AC deprecated strings, and the regex matches the R.string. substring."""
    results = lint(paths("mobile/android/fenix/app/src/main/java/AliasedImport.kt"))
    assert len(results) == 1
    assert "ac_deprecated" in results[0].message


def test_no_cross_project_false_positive(lint, paths):
    """AC has an active string named 'shared_name' (no moz:removedIn).  Fenix
    has deprecated 'fenix_deprecated'.  AC code using R.string.shared_name
    must NOT be flagged -- AC's own string is not deprecated."""
    results = lint(
        paths(
            "mobile/android/android-components/components/feature/example/src/main/java/AcFile.kt",
        )
    )
    # Should only flag ac_deprecated (line 4), NOT shared_name (line 3).
    assert len(results) == 1
    assert "ac_deprecated" in results[0].message


def test_active_string_shadows_imported_deprecated(lint, paths):
    """Fenix has active 'shadowed_name', AC has deprecated 'shadowed_name'.
    Fenix code using R.string.shadowed_name must NOT be flagged because
    fenix's own active string shadows the AC deprecated one."""
    results = lint(paths("mobile/android/fenix/app/src/main/java/Shadow.kt"))
    assert len(results) == 0


def test_focus_sees_ac_deprecated_strings(lint, paths):
    """Focus should see AC deprecated strings, just like fenix."""
    results = lint(paths("mobile/android/focus-android/app/src/main/java/FocusFile.kt"))
    assert len(results) == 1
    assert "ac_deprecated" in results[0].message


def test_focus_active_shadows_ac_deprecated(lint, paths):
    """Focus has active 'shadowed_name', AC has deprecated 'shadowed_name'.
    Focus code using R.string.shadowed_name must NOT be flagged."""
    results = lint(paths("mobile/android/focus-android/app/src/main/java/FocusFile.kt"))
    assert all("shadowed_name" not in r.message for r in results)


def test_skips_non_source_xml(lint, paths):
    """Files outside src/ like lint-baseline.xml should not be checked, even
    if they mention deprecated string names."""
    results = lint(paths("mobile/android/fenix/lint-baseline.xml"))
    assert len(results) == 0


def test_full_scan_on_strings_xml_change(lint, paths):
    """When strings.xml is in the paths, the linter scans all source files."""
    results = lint(paths("mobile/android/fenix/app/src/main/res/values/strings.xml"))
    # Fenix: Bad.kt (1) + bad_layout.xml (1) + TestFile.kt (1) + AliasedImport.kt (1)
    # AC: AcFile.kt (1, only ac_deprecated)
    # Focus: FocusFile.kt (1, only ac_deprecated; shadowed_name is shadowed)
    # Shadow.kt: 0 (shadowed by fenix active)
    # Good.kt: 0
    # good_layout.xml: 0
    # lint-baseline.xml: 0 (not under src/)
    assert len(results) == 6


def test_skips_strings_xml_itself(lint, paths):
    """The linter should not flag the deprecated string definition in strings.xml."""
    results = lint(
        paths(
            "mobile/android/fenix/app/src/main/res/values/strings.xml",
            "mobile/android/fenix/app/src/main/java/Good.kt",
        )
    )
    assert all("strings.xml" not in r.path for r in results)


if __name__ == "__main__":
    mozunit.main()
