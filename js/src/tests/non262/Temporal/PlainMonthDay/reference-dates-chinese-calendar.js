// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

const calendar = "chinese";

// The Chinese calendar has 29-30 days per month.
const tests = [
  {
    day: 29,
    leapMonth: false,
    expected: [
      "1972-03-14[u-ca=chinese]",
      "1972-04-12[u-ca=chinese]",
      "1972-05-12[u-ca=chinese]",
      "1972-06-10[u-ca=chinese]",
      "1972-07-09[u-ca=chinese]",
      "1972-08-08[u-ca=chinese]",
      "1972-09-06[u-ca=chinese]",
      "1972-10-06[u-ca=chinese]",
      "1972-11-04[u-ca=chinese]",
      "1972-12-04[u-ca=chinese]",
      "1972-01-15[u-ca=chinese]",
      "1972-02-13[u-ca=chinese]",
    ],
  },
  {
    day: 29,
    leapMonth: true,
    expected: [
      "1898-03-21[u-ca=chinese]",
      "1947-04-20[u-ca=chinese]",
      "1966-05-19[u-ca=chinese]",
      "1963-06-20[u-ca=chinese]",
      "1971-07-21[u-ca=chinese]",
      "1960-08-21[u-ca=chinese]",
      "1968-09-21[u-ca=chinese]",
      "1957-10-22[u-ca=chinese]",
      "2014-11-21[u-ca=chinese]",
      "1984-12-21[u-ca=chinese]",
      "2034-01-19[u-ca=chinese]",
      "1879-02-20[u-ca=chinese]",
    ],
  },
  {
    day: 30,
    leapMonth: false,
    expected: [
      "1970-03-07[u-ca=chinese]",
      "1972-04-13[u-ca=chinese]",
      "1966-04-20[u-ca=chinese]",
      "1970-06-03[u-ca=chinese]",
      "1972-07-10[u-ca=chinese]",
      "1971-08-20[u-ca=chinese]",
      "1972-09-07[u-ca=chinese]",
      "1971-10-18[u-ca=chinese]",
      "1972-11-05[u-ca=chinese]",
      "1972-12-05[u-ca=chinese]",
      "1970-01-07[u-ca=chinese]",
      "1972-02-14[u-ca=chinese]",
    ],
  },
  {
    day: 30,
    leapMonth: true,
    expected: [
      "1898-03-22[u-ca=chinese]",
      "1830-04-22[u-ca=chinese]",
      "1955-05-21[u-ca=chinese]",
      "1944-06-20[u-ca=chinese]",
      "1952-07-21[u-ca=chinese]",
      "1941-08-22[u-ca=chinese]",
      "1938-09-23[u-ca=chinese]",
      "1691-10-21[u-ca=chinese]",
      "1843-11-21[u-ca=chinese]",
      "1737-12-21[u-ca=chinese]",
      "1890-01-20[u-ca=chinese]",
      "1784-02-20[u-ca=chinese]",
    ],
  },
];

for (let {day, leapMonth, expected} of tests) {
  assertEq(expected.length, 12);

  for (let i = 1; i <= 12; ++i) {
    let expectedToString = expected[i - 1];
    let monthCode = "M" + String(i).padStart(2, "0") + (leapMonth ? "L" : "");

    // Ensure the expected reference years are still correct. (Updating ICU4X
    // may require to adjust the expected results.)
    let pd = Temporal.PlainDate.from(expectedToString);
    assertEq(pd.monthCode, monthCode);
    assertEq(pd.day, day);
    assertEq(pd.toString(), expectedToString);

    // This is subject to change:
    // https://github.com/tc39/proposal-intl-era-monthcode/issues/113
    {
      let pmd = pd.toPlainMonthDay();
      assertEq(pmd.monthCode, monthCode);
      assertEq(pmd.day, day);
      assertEq(pmd.toString(), expectedToString);
    }

    // Dates before ISO year 1900 are changed to use the non-leap month.
    if (leapMonth && pd.withCalendar("iso8601").year < 1900) {
      // Use the expected string from the non-leap month case.
      expectedToString = tests.find(e => e.day === day && !e.leapMonth).expected[i - 1];
      monthCode = monthCode.slice(0, -1);
    }

    let pmd = Temporal.PlainMonthDay.from({calendar, monthCode, day});
    assertEq(pmd.monthCode, monthCode);
    assertEq(pmd.day, day);
    assertEq(pmd.toString(), expectedToString);
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
