// |reftest| skip-if(!this.hasOwnProperty('Intl')||!xulRuntime.shell)

// Don't run in browser because `SpecialPowers.Cu.getJSTestingFunctions()` doesn't
// appear to be able to change locales in other Realms.

// Default locale for jstests is en-US.
const defaultLocale = "en-US";

assertEq(getDefaultLocale(), defaultLocale);

function timeZoneComment(date) {
  return date.toString().match(/\((.*?)\)/)[1];
}

function test(locale, timeZoneName) {
  // The locale of the initial global is correct.
  assertEq(getRealmLocale(), defaultLocale);

  // Create a new global with a different locale.
  var g = newGlobal({locale});

  var initialLocale = locale ?? defaultLocale;

  // Ensure the new global has the expected locale.
  assertEq(g.getRealmLocale(), initialLocale);

  // Create a Date object in the new global.
  var d = new g.Date(0);

  // Get the time zone name from Date.prototype.toString.
  assertEq(timeZoneComment(d), timeZoneName);

  // Change the locale of the new global.
  g.setRealmLocale("fr");

  // Ensure the new global has the expected locale.
  assertEq(g.getRealmLocale(), "fr");

  // The locale of the initial global hasn't changed.
  assertEq(getRealmLocale(), defaultLocale);

  // Ensure the time zone comment uses the new locale.
  assertEq(timeZoneComment(d), "heure normale du Pacifique nord-américain");

  // Change the locale of the new global to use the default locale.
  g.setRealmLocale(undefined);

  // Ensure the new global has the expected locale.
  assertEq(g.getRealmLocale(), defaultLocale);

  // Ensure the time zone comment uses the default locale.
  assertEq(timeZoneComment(d), "Pacific Standard Time");
}

test(undefined, "Pacific Standard Time");
test("de", "Nordamerikanische Westküsten-Normalzeit");

if (typeof reportCompare === "function")
  reportCompare(true, true);
