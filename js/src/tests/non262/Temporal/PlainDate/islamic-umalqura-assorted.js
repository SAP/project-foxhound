// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

function assertDate(actual, {
  year, era, eraYear, month, monthCode, day
}) {
  assertEq(actual.year, year);
  assertEq(actual.era, era);
  assertEq(actual.eraYear, eraYear);
  assertEq(actual.month, month);
  assertEq(actual.monthCode, monthCode);
  assertEq(actual.day, day);
}

const calendar = "islamic-umalqura";

// Bug 2008105
assertDate(Temporal.PlainDate.from({
  calendar,
  year: -4096,
  monthCode: "M12",
  day: 29,
}), {
  year: -4096,
  era: "bh",
  eraYear: 4097,
  month: 12,
  monthCode: "M12",
  day: 29,
});

// https://github.com/unicode-org/icu4x/issues/4982
assertDate(new Temporal.PlainDate(2025, 2, 26, calendar), {
  year: 1446,
  era: "ah",
  eraYear: 1446,
  month: 8,
  monthCode: "M08",
  day: 27,
});

// https://github.com/unicode-org/icu4x/issues/4914
assertDate(Temporal.PlainDate.from({
  calendar,
  year: -6823,
  monthCode: "M01",
  day: 1,
}), {
  year: -6823,
  era: "bh",
  eraYear: 6824,
  month: 1,
  monthCode: "M01",
  day: 1,
});

// https://github.com/unicode-org/icu4x/issues/4917
assertDate(new Temporal.PlainDate(-271821, 4, 19, calendar), {
  year: -280804,
  era: "bh",
  eraYear: 280805,
  month: 3,
  monthCode: "M03",
  day: 21,
});
assertDate(new Temporal.PlainDate(275760, 9, 13, calendar), {
  year: 283583,
  era: "ah",
  eraYear: 283583,
  month: 5,
  monthCode: "M05",
  day: 23,
});

// https://github.com/unicode-org/icu4x/issues/5069
assertDate(Temporal.PlainDate.from({
  calendar,
  year: 1391,
  monthCode: "M01",
  day: 30,
}), {
  year: 1391,
  era: "ah",
  eraYear: 1391,
  month: 1,
  monthCode: "M01",
  day: 29,
});


if (typeof reportCompare === "function")
  reportCompare(true, true);
