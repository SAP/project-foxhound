const {
  Era, Year, Month, Day, Literal
} = DateTimeFormatParts;

const calendar = "japanese";
const timeZone = "UTC";

const tests = {
  "en": [
    {
      options: {
        // defaults to "narrow" era
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("45"), Literal(" "), Era("S")
          ],
        },
        {
          date: "1900-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("33"), Literal(" "), Era("M")
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("23"), Literal("/"), Year("1"), Literal(" "), Era("M")
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("22"), Literal("/"), Year("1868"), Literal(" "), Era("A")
          ],
        },
        {
          date: "1868-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1868"), Literal(" "), Era("A")
          ],
        },
        {
          date: "1800-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1800"), Literal(" "), Era("A")
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("A")
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("B")
          ],
        },
        {
          date: "-000001-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("2"), Literal(" "), Era("B")
          ],
        },
        {
          date: "-100000-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("100001"), Literal(" "), Era("B")
          ],
        },
      ],
    },
    {
      options: {
        era: "short",
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("45"), Literal(" "), Era("Shōwa")
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("23"), Literal("/"), Year("1"), Literal(" "), Era("Meiji")
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("22"), Literal("/"), Year("1868"), Literal(" "), Era("AD")
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("AD")
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("BC")
          ],
        },
      ],
    },
    {
      // "long" era defaults to "short" era format, see link in data/locales/root.txt:
      //   wide:alias{"/LOCALE/calendar/japanese/eras/abbreviated"}
      // CLDR "wide" matches ECMA-402 "long", CLDR "abbreviated" matches ECMA-402 "short" format.
      options: {
        era: "long",
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("45"), Literal(" "), Era("Shōwa")
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("23"), Literal("/"), Year("1"), Literal(" "), Era("Meiji")
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Month("10"), Literal("/"), Day("22"), Literal("/"), Year("1868"), Literal(" "), Era("AD")
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("AD")
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Month("1"), Literal("/"), Day("1"), Literal("/"), Year("1"), Literal(" "), Era("BC")
          ],
        },
      ],
    },
  ],
  "ja": [
    {
      options: {
        // defaults to "narrow" era
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Era("S"), Year("45"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Era("M"), Year("1"), Literal("/"), Month("10"), Literal("/"), Day("23"),
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Era("AD"), Year("1868"), Literal("/"), Month("10"), Literal("/"), Day("22"),
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Era("AD"), Year("1"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Era("BC"), Year("1"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
      ],
    },
    {
      options: {
        era: "short",
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Era("昭和"), Year("45"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Era("明治"), Year("1"), Literal("/"), Month("10"), Literal("/"), Day("23"),
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Era("西暦"), Year("1868"), Literal("/"), Month("10"), Literal("/"), Day("22"),
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Era("西暦"), Year("1"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Era("紀元前"), Year("1"), Literal("/"), Month("1"), Literal("/"), Day("1"),
          ],
        },
      ],
    },
    {
      options: {
        // defaults to "short" era
        year: "numeric",
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Era("昭和"), Year("45"), Literal("年")
          ],
        },
        {
          date: "1868-10-23T00:00:00.000Z",
          parts: [
            Era("明治"), Year("元"), Literal("年")
          ],
        },
        {
          date: "1868-10-22T00:00:00.000Z",
          parts: [
            Era("西暦"), Year("1868"), Literal("年")
          ],
        },
        {
          date: "0001-01-01T00:00:00.000Z",
          parts: [
            Era("西暦"), Year("1"), Literal("年")
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Era("紀元前"), Year("1"), Literal("年")
          ],
        },
      ],
    },
  ],
  "de": [
    {
      options: {
        // defaults to "narrow" era
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Day("1"), Literal("."), Month("1"), Literal("."), Year("45"), Literal(" "), Era("S")
          ],
        },
        {
          date: "1800-01-01T00:00:00.000Z",
          parts: [
            Day("1"), Literal("."), Month("1"), Literal("."), Year("1800"), Literal(" "), Era("n. Chr.")
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Day("1"), Literal("."), Month("1"), Literal("."), Year("1"), Literal(" "), Era("v. Chr.")
          ],
        },
      ],
    },
  ],
  "zh": [
    {
      options: {
        // defaults to "short" era
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Era("昭和"), Year("45"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
        {
          date: "1800-01-01T00:00:00.000Z",
          parts: [
            Era("公元"), Year("1800"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Era("公元前"), Year("1"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
      ],
    },
    {
      options: {
        era: "narrow",
      },
      dates: [
        {
          date: "1970-01-01T00:00:00.000Z",
          parts: [
            Era("S"), Year("45"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
        {
          date: "1800-01-01T00:00:00.000Z",
          parts: [
            Era("公元"), Year("1800"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
        {
          date: "0000-01-01T00:00:00.000Z",
          parts: [
            Era("公元前"), Year("1"), Literal("-"), Month("01"), Literal("-"), Day("01"),
          ],
        },
      ],
    },
  ],
};

const defaultEraFormat = {
  "en": "narrow",
  "ja": "narrow",
  "de": "narrow",
  "zh": "short",
};

for (let locale of Object.keys(tests)) {
  assertEq(locale in defaultEraFormat, true, `missing default era format for: ${locale}`);

  let dtf = new Intl.DateTimeFormat(locale, {calendar, timeZone});
  assertEq(dtf.resolvedOptions().era, defaultEraFormat[locale], `bad default era format for: ${locale}`);
}

for (let [locale, inputs] of Object.entries(tests)) {
  for (let {options, dates} of inputs) {
    let dtf = new Intl.DateTimeFormat(locale, {calendar, timeZone, ...options});
    for (let {date, parts} of dates) {
      let d = new Date(date);
      assertEq(d.toISOString(), date);
      assertParts(dtf, d, parts);
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
