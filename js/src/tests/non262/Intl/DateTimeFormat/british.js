/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// The winter time abbreviation for London should be
// "GMT" in British English even prior to 1971-10-31.

function formatLondon(dateAsString, locale) {
  let parts = new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/London",
    timeZoneName: "short"
  }).formatToParts(new Date(dateAsString));

  let part = parts.find(p => p.type == "timeZoneName");

  return part.value;
}

// Check offset assumptions by using en-US
assertEq(formatLondon("1947-04-12", "en-US"), "GMT+1");
assertEq(formatLondon("1947-04-14", "en-US"), "GMT+2");
assertEq(formatLondon("1968-01-01", "en-US"), "GMT+0");
assertEq(formatLondon("2026-01-01", "en-US"), "GMT"); // Metazones work from 1970 onwards!
assertEq(formatLondon("2026-04-12", "en-US"), "GMT+1");
assertEq(formatLondon("2026-04-14", "en-US"), "GMT+1");

// Now check en-GB
assertEq(formatLondon("1947-04-12", "en-GB"), "BST");
assertEq(formatLondon("1947-04-14", "en-GB"), "GMT+2"); // Assuming BDST no longer recognized by users.
assertEq(formatLondon("1968-01-01", "en-GB"), "GMT");
assertEq(formatLondon("2026-01-01", "en-GB"), "GMT");
assertEq(formatLondon("2026-04-12", "en-GB"), "BST");
assertEq(formatLondon("2026-04-14", "en-GB"), "BST");

if (typeof reportCompare === "function") {
    reportCompare(0, 0, "ok");
}
