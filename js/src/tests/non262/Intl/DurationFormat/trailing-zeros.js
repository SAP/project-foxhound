// Ensure trailing zeros are currently emitted for fractional duration values.

const locale = "en";

const unitToNanos = {
  seconds: 1e9,
  milliseconds: 1e6,
  microseconds: 1e3,
  nanoseconds: 1e0,
};

for (let [unit, nextUnit] of Iterator.zip([
  Iterator.from(Object.keys(unitToNanos)),
  Iterator.from(Object.keys(unitToNanos)).drop(1),
])) {
  let df = new Intl.DurationFormat(locale, {
    [unit]: "long",
    [nextUnit]: "numeric",
  });
  let nf = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: unit.slice(0, -1),
    unitDisplay: "long",
  });

  for (let e = 0; e <= 10; ++e) {
    let number = 10 ** e;

    assertEq(
      df.format({nanoseconds: number * unitToNanos[unit]}),
      nf.format(number)
    );
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
