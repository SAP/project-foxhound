// |jit-test| skip-if: typeof Intl === 'undefined'

var timeZones = [
  "PST8PDT",
  "UTC",
];

var expected = [
  -8639999986022000,
  NaN,
];

for (var i = 0; i < 100; ++i) {
  setTimeZone(timeZones[i & 1]);

  // Constant string with local time. Inside the valid time value limits when
  // the current time zone is PST8PDT, but outside the valid limits for UTC.
  var t = Date.parse("-271821-04-19T20:00");
  assertEq(t, expected[i & 1]);
}
