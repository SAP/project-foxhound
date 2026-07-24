// |jit-test| skip-if: typeof Intl === 'undefined'

function testDefaultCaseMapping() {
  for (var i = 0; i < 100; ++i) {
    assertEq("TURKISH I".toLocaleLowerCase(), "turkish i");
  }
}

function testTurkishCaseMapping() {
  for (var i = 0; i < 100; ++i) {
    assertEq("TURKISH I".toLocaleLowerCase(), "turk\u{131}sh \u{131}");
  }
}

// JIT tests run with "en-US" by default. (Or "en-US-POSIX" for some Android tests.)
assertEq(
  getDefaultLocale() === "en-US" || getDefaultLocale() === "en-US-POSIX",
  true
);
assertEq(getRealmLocale(), "en-US");

// Ensure case mapping fuse is intact.
assertEq(getFuseState().DefaultLocaleHasDefaultCaseMappingFuse.intact, true);

// Run default case mapping test.
testDefaultCaseMapping();

// Change runtime default locale. (Use three letter language code to cover canonicalization.)
setDefaultLocale("fra-FR");
assertEq(getDefaultLocale(), "fra-FR");
assertEq(getRealmLocale(), "fr-FR");

// Ensure case mapping fuse is still intact.
assertEq(getFuseState().DefaultLocaleHasDefaultCaseMappingFuse.intact, true);

// Run default case mapping test again.
testDefaultCaseMapping();

// Change runtime default locale.
setDefaultLocale("tur-TR");
assertEq(getDefaultLocale(), "tur-TR");
assertEq(getRealmLocale(), "tr-TR");

// Case mapping fuse is no longer intact.
assertEq(getFuseState().DefaultLocaleHasDefaultCaseMappingFuse.intact, false);

testTurkishCaseMapping();

// Reset default locale.
setDefaultLocale("eng-US");
assertEq(getDefaultLocale(), "eng-US");
assertEq(getRealmLocale(), "en-US");

// Fuse is still popped.
assertEq(getFuseState().DefaultLocaleHasDefaultCaseMappingFuse.intact, false);

// Run default case mapping test.
testDefaultCaseMapping();
