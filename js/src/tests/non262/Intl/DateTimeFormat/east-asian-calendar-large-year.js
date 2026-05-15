// |reftest| skip-if(!this.hasOwnProperty('Intl'))

const date = new Date("+100000-01-01T00:00:00.000Z");
const options = {timeZone: "UTC"};
const expected = "11/29/99999";

const fromParts = ({value}) => value;

assertEq(
  new Intl.DateTimeFormat("en-u-ca-chinese", options).format(date),
  expected
);

assertEq(
  new Intl.DateTimeFormat("en-u-ca-chinese", options).formatToParts(date).map(fromParts).join(""),
  expected
);

assertEq(
  new Intl.DateTimeFormat("en-u-ca-dangi", options).format(date),
  expected
);

assertEq(
  new Intl.DateTimeFormat("en-u-ca-dangi", options).formatToParts(date).map(fromParts).join(""),
  expected
);

if (typeof reportCompare === "function")
  reportCompare(true, true);
