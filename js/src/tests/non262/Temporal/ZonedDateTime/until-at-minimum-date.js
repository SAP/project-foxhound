// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

function tryUntil(date, other, options) {
  try {
    return date.until(other, options).toString();
  } catch {
    return "Invalid";
  }
}

const minZoned = new Temporal.ZonedDateTime(-8640000000000000000000n, "UTC");

{
  // minZoned with one day added.
  let other = minZoned.add("P1D");

  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2 }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2 }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "P2D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "weeks" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "months" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "years" }), "Invalid");
}

{
  // minZoned with one week added.
  let other = minZoned.add("P1W");

  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2 }), "P6D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2 }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "P8D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "weeks" }), "P1W");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "months" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "years" }), "Invalid");
}

{
  // minZoned with one month added.
  let other = minZoned.add("P1M");

  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2 }), "P30D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2 }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "P30D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "weeks" }), "P4W");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "months" }), "P1M");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "years" }), "PT0S");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "years" }), "Invalid");
}

{
  // minZoned with one year added.
  let other = minZoned.add("P1Y");

  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2 }), "P366D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2 }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "P366D");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "weeks" }), "P52W");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "weeks" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "months" }), "P12M");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "months" }), "Invalid");
  assertEq(tryUntil(minZoned, other, { smallestUnit: "years" }), "P1Y");
  assertEq(tryUntil(other, minZoned, { smallestUnit: "years" }), "Invalid");
}

{
  // minZoned with one month added and one day subtracted.
  let other = minZoned.add("P1M").subtract("P1D");
  let oneDayLess = other.subtract("P1D");

  let options = {smallestUnit: "days", roundingIncrement: 2, roundingMode: "expand"};
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "weeks", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "weeks", ...options }), "-P2D");
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "months", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "months", ...options }), "Invalid");
  assertEq(tryUntil(oneDayLess, other, { largestUnit: "years", ...options }), "P2D");
  assertEq(tryUntil(other, oneDayLess, { largestUnit: "years", ...options }), "Invalid");
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
