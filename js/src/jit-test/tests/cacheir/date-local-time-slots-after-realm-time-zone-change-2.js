// |jit-test| tz-pacific; skip-if: typeof Intl === 'undefined'

// Create Date objects using the current local time zone, which is PST8PDT when
// running jit-tests.
var dates = [
  new Date(2000, 0, 1, 0),
  new Date(2000, 0, 1, 1),
  new Date(2000, 0, 1, 2),
  new Date(2000, 0, 1, 3),
];

var addToHours = 0;

for (var i = 0; i < 250; ++i) {
  // Use previously created Date objects.
  var d = dates[i & 3];

  // |getHours| is inlined if no realm time zone override is present.
  assertEq(d.getHours(), (i & 3) + addToHours);

  if (i === 200) {
    // Modify the realm time zone. This discards all JIT code and |getHours| is
    // no longer inlinable.
    setRealmTimeZone("EST5EDT");

    // The Date objects were created using PST8PDT, which is three hours behind EST5EDT.
    addToHours = 3;
  }
}
