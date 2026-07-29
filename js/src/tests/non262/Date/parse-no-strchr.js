// Make U+ff20 isn't implicitly truncated to U+0020 as if by calling strchr.
assertEq(Date.parse("\u{ff20}2025-01-01"), NaN);

// Actual U+0020 is skipped.
assertEq(Date.parse("\u{20}2025-01-01"), Date.parse("2025-01-01T00:00"));

if (typeof reportCompare === "function")
  reportCompare(true, true);
