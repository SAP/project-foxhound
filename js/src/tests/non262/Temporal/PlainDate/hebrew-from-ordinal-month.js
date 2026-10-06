// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

const calendar = "hebrew";

function assertDate(actual, {year, month, monthCode, day}) {
  assertEq(actual.year, year);
  assertEq(actual.month, month);
  assertEq(actual.monthCode, monthCode);
  assertEq(actual.day, day);
}

// 5783 is a common year.
const commonYear = 5783;

// 5784 is a leap year.
const leapYear = 5784;

// Test common and leap years.
for (let year of [commonYear, leapYear]) {
  let firstDayOfYear = Temporal.PlainDate.from({calendar, year, monthCode: "M01", day: 1});
  assertEq(firstDayOfYear.inLeapYear, (year === leapYear));

  let monthsInYear = firstDayOfYear.monthsInYear;
  assertEq(monthsInYear, 12 + firstDayOfYear.inLeapYear);

  // Test for each month in the year.
  for (let month = 1; month <= monthsInYear; ++month) {
    let firstDayOfMonthFromOrdinalMonth = Temporal.PlainDate.from({calendar, year, month, day: 1});
    let monthCode = firstDayOfMonthFromOrdinalMonth.monthCode;
    assertDate(firstDayOfMonthFromOrdinalMonth, {year, month, monthCode, day: 1});

    let firstDayOfMonthFromMonthCode = Temporal.PlainDate.from({calendar, year, monthCode, day: 1});
    assertDate(firstDayOfMonthFromMonthCode, {year, month, monthCode, day: 1});

    // 29-30 days for each month.
    let daysInMonth = firstDayOfMonthFromOrdinalMonth.daysInMonth;
    assertEq(29 <= daysInMonth && daysInMonth <= 30 , true);

    // Test for each day of the month.
    for (let day = 2; day <= daysInMonth; ++day) {
      for (let overflow of ["constrain", "reject"]) {
        let fromOrdinalMonth = Temporal.PlainDate.from({calendar, year, month, day}, {overflow});
        assertDate(fromOrdinalMonth, {year, month, monthCode, day});

        let fromMonthCode = Temporal.PlainDate.from({calendar, year, monthCode, day}, {overflow});
        assertDate(fromMonthCode, {year, month, monthCode, day});
      }
    }

    // Test too large day values.
    for (let day = daysInMonth + 1; day <= daysInMonth + 4; ++day) {
      let fromOrdinalMonth = Temporal.PlainDate.from({calendar, year, month, day}, {overflow: "constrain"});
      assertDate(fromOrdinalMonth, {year, month, monthCode, day: daysInMonth});

      let fromMonthCode = Temporal.PlainDate.from({calendar, year, monthCode, day}, {overflow: "constrain"});
      assertDate(fromMonthCode, {year, month, monthCode, day: daysInMonth});

      assertThrowsInstanceOf(() => {
        Temporal.PlainDate.from({calendar, year, month, day}, {overflow: "reject"});
      }, RangeError);
      assertThrowsInstanceOf(() => {
        Temporal.PlainDate.from({calendar, year, monthCode, day}, {overflow: "reject"});
      }, RangeError);
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
