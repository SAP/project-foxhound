// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

function tryUntil(date, other, options) {
  try {
    return date.until(other, options).toString();
  } catch {
    return "Invalid";
  }
}

const minDate = new Temporal.PlainDate(-271821, 4, 19);

{
  // minDate with one day added.
  let other = new Temporal.PlainDate(-271821, 4, 19 + 1);

  assertEq(tryUntil(minDate, other, { roundingIncrement: 2 }), "PT0S");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2 }), "PT0S");
  assertEq(tryUntil(minDate, other, { roundingIncrement: 2, roundingMode: "expand" }), "P2D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2, roundingMode: "expand" }), "-P2D");
  assertEq(tryUntil(minDate, other, { smallestUnit: "weeks" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "months" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "years" }), "Invalid");
}

{
  // minDate with one week added.
  let other = new Temporal.PlainDate(-271821, 4, 19 + 7);

  assertEq(tryUntil(minDate, other, { roundingIncrement: 2 }), "P6D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2 }), "-P6D");
  assertEq(tryUntil(minDate, other, { roundingIncrement: 2, roundingMode: "expand" }), "P8D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2, roundingMode: "expand" }), "-P8D");
  assertEq(tryUntil(minDate, other, { smallestUnit: "weeks" }), "P1W");
  assertEq(tryUntil(other, minDate, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "months" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "years" }), "Invalid");
}

{
  // minDate with one month added.
  let other = new Temporal.PlainDate(-271821, 4 + 1, 19);

  assertEq(tryUntil(minDate, other, { roundingIncrement: 2 }), "P30D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2 }), "-P30D");
  assertEq(tryUntil(minDate, other, { roundingIncrement: 2, roundingMode: "expand" }), "P30D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2, roundingMode: "expand" }), "-P30D");
  assertEq(tryUntil(minDate, other, { smallestUnit: "weeks" }), "P4W");
  assertEq(tryUntil(other, minDate, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "months" }), "P1M");
  assertEq(tryUntil(other, minDate, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minDate, { smallestUnit: "years" }), "Invalid");
}

{
  // minDate with one year added.
  let other = new Temporal.PlainDate(-271821 + 1, 4, 19);

  assertEq(tryUntil(minDate, other, { roundingIncrement: 2 }), "P366D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2 }), "-P366D");
  assertEq(tryUntil(minDate, other, { roundingIncrement: 2, roundingMode: "expand" }), "P366D");
  assertEq(tryUntil(other, minDate, { roundingIncrement: 2, roundingMode: "expand" }), "-P366D");
  assertEq(tryUntil(minDate, other, { smallestUnit: "weeks" }), "P52W");
  assertEq(tryUntil(other, minDate, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "months" }), "P12M");
  assertEq(tryUntil(other, minDate, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minDate, other, { smallestUnit: "years" }), "P1Y");
  assertEq(tryUntil(other, minDate, { smallestUnit: "years" }), "Invalid");
}

{
  // minDate with one month added.
  let other = new Temporal.PlainDate(-271821, 4 + 1, 19);
  let oneDayLess = new Temporal.PlainDate(-271821, 4 + 1, 18);

  let options = {smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand"};
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "weeks", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "weeks", ...options }), "-P2D");
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "months", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "months", ...options }), "-P2D");
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "years", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "years", ...options }), "-P2D");
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
