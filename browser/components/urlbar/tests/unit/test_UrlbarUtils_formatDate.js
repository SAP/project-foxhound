/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Tests `UrlbarUtils.formatDate()` and `parseDate()`.

"use strict";

add_setup(async function init() {
  // This test deals with `Intl` formating of dates and times, which depends on
  // the system locale, and assumes it's en-US. Make sure it's actually en-US.
  await QuickSuggestTestUtils.setRegionAndLocale({
    locale: "en-US",
    skipSuggestReset: true,
  });
});

// Main test for `UrlbarUtils.formatDate()`.
add_task(async function formatDate() {
  // For each test, we'll set `now`, call `formatDate` with `date` and
  // `options`, and check the return value against `expected`.
  let tests = [
    // date is before this year
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2013-05-11T04:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "May 11, 2013",
            formattedTime: undefined,
            isRelative: false,
          },
        },
      ],
    },

    // date is earlier this year
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-01-01T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Jan 1",
            formattedTime: undefined,
            isRelative: false,
          },
        },
      ],
    },

    // date is seven days ago
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-10-24T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Oct 24",
            formattedTime: undefined,
            isRelative: false,
          },
        },
      ],
    },

    // date is six days ago
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-10-25T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Oct 25",
            formattedTime: undefined,
            isRelative: false,
          },
        },
      ],
    },

    // date is yesterday
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-10-30T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "yesterday",
            formattedTime: undefined,
            isRelative: true,
          },
        },
        {
          options: {
            capitalizeRelativeDate: true,
          },
          expected: {
            formattedDate: "Yesterday",
            formattedTime: undefined,
            isRelative: true,
          },
        },
      ],
    },

    // date is today (past)
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2025-10-31T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "today",
            formattedTime: undefined,
            isRelative: true,
          },
        },
        {
          options: {
            capitalizeRelativeDate: true,
          },
          expected: {
            formattedDate: "Today",
            formattedTime: undefined,
            isRelative: true,
          },
        },
      ],
    },

    // date is today (now)
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2025-10-31T12:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "today",
            formattedTime: undefined,
            isRelative: true,
          },
        },
        {
          options: {
            capitalizeRelativeDate: true,
          },
          expected: {
            formattedDate: "Today",
            formattedTime: undefined,
            isRelative: true,
          },
        },
      ],
    },

    // date is today (future)
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-10-31T12:00:01-07:00",
      cases: [
        {
          expected: {
            formattedDate: "today",
            formattedTime: "12:00 PM",
            isRelative: true,
          },
        },
        {
          options: {
            capitalizeRelativeDate: true,
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "Today",
            formattedTime: "12:00 PM GMT-7",
            isRelative: true,
          },
        },
      ],
    },

    // date is tomorrow
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-11-01T12:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "tomorrow",
            formattedTime: "12:00 PM",
            isRelative: true,
          },
        },
        {
          options: {
            capitalizeRelativeDate: true,
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "Tomorrow",
            formattedTime: "12:00 PM GMT-7",
            isRelative: true,
          },
        },
      ],
    },

    // date is six days from now
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-11-06T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Thu",
            formattedTime: "12:00 AM",
            isRelative: false,
          },
        },
        {
          options: {
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "Thu",
            formattedTime: "12:00 AM GMT-7",
            isRelative: false,
          },
        },
      ],
    },

    // date is seven days from now
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-11-07T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Nov 7",
            formattedTime: "12:00 AM",
            isRelative: false,
          },
        },
        {
          options: {
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "Nov 7",
            formattedTime: "12:00 AM GMT-7",
            isRelative: false,
          },
        },
      ],
    },

    // date is later this year
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2025-12-31T00:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "Dec 31",
            formattedTime: "12:00 AM",
            isRelative: false,
          },
        },
        {
          options: {
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "Dec 31",
            formattedTime: "12:00 AM GMT-7",
            isRelative: false,
          },
        },
      ],
    },

    // date is after this year
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "2026-05-11T04:00:00-07:00",
      cases: [
        {
          expected: {
            formattedDate: "May 11, 2026",
            formattedTime: "4:00 AM",
            isRelative: false,
          },
        },
        {
          options: {
            includeTimeZone: true,
          },
          expected: {
            formattedDate: "May 11, 2026",
            formattedTime: "4:00 AM GMT-7",
            isRelative: false,
          },
        },
      ],
    },
  ];

  for (let { now, date, cases } of tests) {
    UrlbarTestUtils.stubNowZonedDateTime(now);
    for (let { options, expected } of cases) {
      let actual = UrlbarUtils.formatDate(new Date(date), options);

      // There's another task that tests `parseDate()`, so just check that the
      // `parseDateResult` is present rather than its properties.
      Assert.ok(actual.parseDateResult, "parseDateResult should be present");
      delete actual.parseDateResult;

      Assert.deepEqual(
        actual,
        expected,
        "formatDate test: " + JSON.stringify({ now, date, options })
      );
    }
  }
});

// Main test for `UrlbarUtils.parseDate()`.
add_task(async function parseDate() {
  // For each test, we'll set `now`, call `parseDate` with `date`, and check the
  // return value against `expected`.
  let tests = [
    // date is before this year
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2013-05-11T04:00:00-07:00",
      expected: {
        daysUntil: -4556,
        isFuture: false,
      },
    },

    // date is before yesterday
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-29T00:00:00-07:00", "2025-10-29T23:59:59-07:00"],
      expected: {
        daysUntil: -2,
        isFuture: false,
      },
    },

    // date is yesterday
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-30T00:00:00-07:00", "2025-10-30T23:59:59-07:00"],
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },

    // date is today (past)
    {
      now: [
        "2025-10-31T12:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-10-31T00:00:00-07:00", "2025-10-31T11:59:59-07:00"],
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // date is today (now)
    {
      now: "2025-10-31T12:00:00-07:00[-07:00]",
      date: "2025-10-31T12:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // date is today (future)
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T12:00:00-07:00[-07:00]",
      ],
      date: ["2025-10-31T12:00:01-07:00", "2025-10-31T23:59:59-07:00"],
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },

    // date is tomorrow
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-11-01T00:00:00-07:00", "2025-11-01T23:59:59-07:00"],
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },

    // date is after tomorrow
    {
      now: [
        "2025-10-31T00:00:00-07:00[-07:00]",
        "2025-10-31T23:59:59-07:00[-07:00]",
      ],
      date: ["2025-11-02T00:00:00-07:00", "2025-11-02T23:59:59-07:00"],
      expected: {
        daysUntil: 2,
        isFuture: true,
      },
    },

    // date is after this year
    {
      now: "2025-10-31T00:00:00-07:00[-07:00]",
      date: "3013-05-11T04:00:00-07:00",
      expected: {
        daysUntil: 360686,
        isFuture: true,
      },
    },
  ];

  for (let { now, date, expected } of tests) {
    let nows = typeof now == "string" ? [now] : now;
    let dates = typeof date == "string" ? [date] : date;
    for (let n of nows) {
      let zonedNow = UrlbarTestUtils.stubNowZonedDateTime(n);
      for (let d of dates) {
        Assert.deepEqual(
          UrlbarUtils.parseDate(new Date(d)),
          {
            ...expected,
            zonedNow,
            zonedDate: new Date(d)
              .toTemporalInstant()
              .toZonedDateTimeISO(zonedNow),
          },
          "parseDate test: " + JSON.stringify({ now: n, date: d })
        );
      }
    }
  }
});

// Tests `UrlbarUtils.parseDate()` with dates across time zone changes.
add_task(function timeZoneTransition() {
  // This task is based around 2025-11-02, when Daylight Saving Time ends in the
  // U.S. On 2025-11-02 at 2:00 am, the time changes to 1:00 am Standard Time.

  let tests = [
    // `now` and `date` both in PDT (daylight saving)
    {
      now: "2025-10-02T12:00:00-07:00[America/Los_Angeles]",
      date: "2025-10-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },

    // `now` in PST, `date` in PDT
    {
      now: "2025-11-03T00:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -2,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T12:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T23:59:59-08:00[America/Los_Angeles]",
      date: "2025-11-01T00:00:00-07:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-02T00:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },
    {
      now: "2025-11-02T01:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-07:00",
      expected: {
        daysUntil: 0,
        isFuture: false,
      },
    },

    // `now` in PDT, `date` in PST
    {
      now: "2025-11-02T01:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },
    {
      now: "2025-11-02T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 0,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T23:59:59-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T01:00:00-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-02T12:00:00-08:00",
      expected: {
        daysUntil: 1,
        isFuture: true,
      },
    },
    {
      now: "2025-11-01T00:00:00-07:00[America/Los_Angeles]",
      date: "2025-11-03T00:00:00-08:00",
      expected: {
        daysUntil: 2,
        isFuture: true,
      },
    },

    // `now` and `date` both in PST (standard time)
    {
      now: "2025-11-11T12:00:00-08:00[America/Los_Angeles]",
      date: "2025-11-10T00:00:00-08:00",
      expected: {
        daysUntil: -1,
        isFuture: false,
      },
    },
  ];

  for (let { now, date, expected } of tests) {
    let zonedNow = UrlbarTestUtils.stubNowZonedDateTime(now);
    Assert.deepEqual(
      UrlbarUtils.parseDate(new Date(date)),
      {
        ...expected,
        zonedNow,
        zonedDate: new Date(date)
          .toTemporalInstant()
          .toZonedDateTimeISO(zonedNow),
      },
      "timeZoneTransition test: " + JSON.stringify({ now, date })
    );
  }
});
