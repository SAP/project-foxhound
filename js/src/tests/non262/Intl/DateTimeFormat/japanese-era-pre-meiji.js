if (typeof getAvailableLocalesOf === "undefined") {
  var getAvailableLocalesOf = SpecialPowers.Cu.getJSTestingFunctions().getAvailableLocalesOf;
}

const locales = getAvailableLocalesOf("DateTimeFormat");

const eras = [
  "long",
  "short",
  "narrow",
];

function formatEra(dtf, date) {
  return dtf.formatToParts(date).find(e => e.type === "era").value;
}

const dates = [
  new Date("-001000-01-01"),
  new Date("+001000-01-01"),
];

for (let locale of locales) {
  // Testing all locales makes this test too slow, so only test basic locales.
  if (locale.includes("-")) {
    continue;
  }

  for (let era of eras) {
    let japanese = new Intl.DateTimeFormat(locale, {
      calendar: "japanese",
      era,
    });

    let gregorian = new Intl.DateTimeFormat(locale, {
      calendar: "gregory",
      era: era !== "long" ? era : "short",
    });

    for (let date of dates) {
      let actual = formatEra(japanese, date);
      assertEq(actual !== undefined, true);
      assertEq(actual, formatEra(gregorian, date));
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
