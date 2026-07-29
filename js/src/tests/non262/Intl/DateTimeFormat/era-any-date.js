// Test using "era" option for all possible calendars. The exact formatted
// result is not tested, it should only be consistent with the resolved options.

const eras = [
  "long", "short", "narrow",
];

const dates = [
  // Far past
  new Date(-100000, 0, 1),

  // Start of epoch.
  new Date(0),

  // Far future
  new Date(+100000, 0, 1),
];

for (let calendar of Intl.supportedValuesOf("calendar")) {
  for (let era of eras) {
    let dtf = new Intl.DateTimeFormat("en", {calendar, era});
    let resolved = dtf.resolvedOptions();

    for (let date of dates) {
      let parts = dtf.formatToParts(date);

      // Ensure there's an "era" part when the resolved options include "era".
      assertEq(parts.some(p => p.type === "era"), Object.hasOwn(resolved, "era"));

      // Resolved options should always contain year, month, and day.
      assertEq(Object.hasOwn(resolved, "year"), true);
      assertEq(Object.hasOwn(resolved, "month"), true);
      assertEq(Object.hasOwn(resolved, "day"), true);

      // The corresponding format parts are also always present.
      assertEq(parts.some(p => p.type === "year" || p.type === "relatedYear"), true);
      assertEq(parts.some(p => p.type === "month"), true);
      assertEq(parts.some(p => p.type === "day"), true)
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
