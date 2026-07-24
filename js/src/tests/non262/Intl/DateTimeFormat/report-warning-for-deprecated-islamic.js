// |reftest| skip-if(!this.hasOwnProperty("Intl")||!xulRuntime.shell)

const locales = [
  "en", "ar", "ar-SA", "ar-EG",
];

const deprecated = [
  "islamic",
];

const supportedCalendars = Intl.supportedValuesOf("calendar");

function test(calendar, locale, options = undefined) {
  // Enable warning reporter.
  enableLastWarning();

  // Create new DateTimeFormat.
  let dtf = new Intl.DateTimeFormat(locale, options);

  // Options are lazily resolved...
  let resolved = dtf.resolvedOptions();

  // Inspect last warning.
  if (deprecated.includes(calendar)) {
    let warning = getLastWarning();
    assertEq(warning !== null, true, `missing warning for ${locale}`);
    assertEq(
      warning.message.includes(calendar),
      true,
      `warning "${warning}" doesn't include calendar "${calendar}"`
    );

    assertEq(
      resolved.calendar,
      "islamic-tbla",
      `bad resolved fallback calendar for ${locale}`
    );
  } else {
    let warning = getLastWarning();
    assertEq(warning === null, true, `unexpected warning for ${locale}`);

    assertEq(
      resolved.calendar,
      calendar,
      `bad resolved calendar for ${locale}`
    );
  }

  // Disable warning reporter.
  disableLastWarning();
}

for (let calendar of [...deprecated, ...supportedCalendars]) {
  if (deprecated.includes(calendar)) {
    assertEq(
      supportedCalendars.includes(calendar),
      false,
      `${calendar} is deprecated`
    );
  }

  for (let locale of locales) {
    // Test as option.
    test(calendar, locale, {calendar});

    // Test as Unicode local extension.
    test(calendar, locale + "-u-ca-" + calendar);

    // Also test with non-canonical case.
    test(calendar, locale, {calendar: calendar.toUpperCase()});
    test(calendar, locale + "-u-ca-" + calendar.toUpperCase());
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
