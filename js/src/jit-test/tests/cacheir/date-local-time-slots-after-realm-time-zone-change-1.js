// |jit-test| skip-if: typeof Intl === 'undefined'

for (var i = 0; i < 250; ++i) {
  // Create new Date objects.
  var d = new Date(2000, 0, 1, i & 3);

  // |getHours| is inlined if no realm time zone override is present.
  assertEq(d.getHours(), i & 3);

  if (i === 200) {
    // Modify the realm time zone. This discards all JIT code and |getHours| is
    // no longer inlinable.
    setRealmTimeZone("Europe/Paris");
  }
}
