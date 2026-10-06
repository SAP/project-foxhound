// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

function assertDate(actual, {year, month, monthCode, day}) {
  assertEq(actual.year, year);
  assertEq(actual.month, month);
  assertEq(actual.monthCode, monthCode);
  assertEq(actual.day, day);
}

function assertYearMonth(actual, {year, month, monthCode}) {
  assertEq(actual.year, year);
  assertEq(actual.month, month);
  assertEq(actual.monthCode, monthCode);
}

const dates = [
  {
    // Minimum valid ISO date: -271821 April, 19
    date: new Temporal.PlainDate(-271821, 4, 19),
    calendars: {
      chinese: {
        date: {year: -271821, monthCode: "M03", month: 3, day: 17},
        yearmonth: {year: -271821, monthCode: "M02", month: 2},
      },
      dangi: {
        date: {year: -271821, monthCode: "M03", month: 3, day: 17},
        yearmonth: {year: -271821, monthCode: "M02", month: 2},
      },
    }
  },
  {
    // Maximum valid ISO date: 275760 September, 13
    date: new Temporal.PlainDate(275760, 9, 13),
    calendars: {
      chinese: {
        date: {year: 275760, monthCode: "M07", month: 7, day: 30},
        yearmonth: {year: 275760, monthCode: "M07", month: 7},
      },
      dangi: {
        date: {year: 275760, monthCode: "M07", month: 7, day: 30},
        yearmonth: {year: 275760, monthCode: "M07", month: 7},
      },
    }
  }
];

for (let {date, calendars} of dates) {
  for (let [calendar, expected] of Object.entries(calendars)) {
    // From plain date in target calendar.
    assertDate(new Temporal.PlainDate(date.year, date.month, date.day, calendar), expected.date);

    // From ISO plain date, change calendar using |withCalendar|.
    assertDate(date.withCalendar(calendar), expected.date);

    // PlainDate.from using ordinal month.
    assertDate(Temporal.PlainDate.from({
      calendar,
      year: expected.date.year,
      month: expected.date.month,
      day: expected.date.day,
    }), expected.date);

    // PlainDate.from using month code.
    assertDate(Temporal.PlainDate.from({
      calendar,
      year: expected.date.year,
      monthCode: expected.date.monthCode,
      day: expected.date.day,
    }), expected.date);

    // From plain year-month in target calendar.
    assertYearMonth(new Temporal.PlainYearMonth(date.year, date.month, calendar), expected.yearmonth);

    // From ISO plain year-month, change calendar using |withCalendar|.
    assertYearMonth(date.withCalendar(calendar).toPlainYearMonth(), expected.date);

    // |PlainYearMonth.from| near the minimum valid range creates an invalid result per spec.
    if (date.year < 0) {
      continue;
    }

    // PlainYearMonth.from using ordinal month.
    assertYearMonth(Temporal.PlainYearMonth.from({
      calendar,
      year: expected.yearmonth.year,
      month: expected.yearmonth.month,
    }), expected.yearmonth);

    // PlainYearMonth.from using month code.
    assertYearMonth(Temporal.PlainYearMonth.from({
      calendar,
      year: expected.yearmonth.year,
      monthCode: expected.yearmonth.monthCode,
    }), expected.yearmonth);
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
