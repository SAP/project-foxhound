// |jit-test| skip-if: typeof Intl === 'undefined'

function test() {
  for (var i = 0; i <= 100; ++i) {
    if (i === 100) {
      setRealmLocale("tr-TR");
    }
    assertEq(
      "TURKISH I".toLocaleLowerCase(),
      i < 100 ? "turkish i" : "turk\u{131}sh \u{131}",
    );
  }
}
test();
