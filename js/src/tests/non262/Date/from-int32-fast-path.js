// Test for int32 fast-path in MakeDay.

// Maximum values for the int32 fast-path.
const maxYears = 1_000_000;
const maxMonths = 1_000_000 * 12;
const maxDate = 100_000_000;

// Test with positive values.
//
// Note: Zero year component is equal to 1900.
assertEq(Date.UTC(0, 0, maxDate), 8637790924800000);
assertEq(Date.UTC(0, maxMonths, 0), NaN);
assertEq(Date.UTC(0, maxMonths, maxDate), NaN);
assertEq(Date.UTC(maxYears, 0, 0), NaN);
assertEq(Date.UTC(maxYears, 0, maxDate), NaN);
assertEq(Date.UTC(maxYears, maxMonths, 0), NaN);
assertEq(Date.UTC(maxYears, maxMonths, maxDate), NaN);

// Test with negative values.
//
// Note: Zero year component is equal to 1900.
assertEq(Date.UTC(0, 0, -maxDate), NaN);
assertEq(Date.UTC(0, -maxMonths, 0), NaN);
assertEq(Date.UTC(0, -maxMonths, -maxDate), NaN);
assertEq(Date.UTC(-maxYears, 0, 0), NaN);
assertEq(Date.UTC(-maxYears, 0, -maxDate), NaN);
assertEq(Date.UTC(-maxYears, -maxMonths, 0), NaN);
assertEq(Date.UTC(-maxYears, -maxMonths, -maxDate), NaN);

// Years and months can cancel each other out.
assertEq(
  Date.UTC(maxYears, -maxMonths, 1),
  Date.parse("0000-01-01T00:00:00.000Z")
);
assertEq(
  Date.UTC(-maxYears, maxMonths, 1),
  Date.parse("0000-01-01T00:00:00.000Z")
);

// Maximum valid date-time values are 100_000_000 days relative to January 1, 1970.
assertEq(
  Date.UTC(1970, 0, 1 + 100_000_000),
  8640000000000000
);
assertEq(
  Date.UTC(1970, 0, 1 - 100_000_000),
  -8640000000000000
);

if (typeof reportCompare === "function")
  reportCompare(true, true);
