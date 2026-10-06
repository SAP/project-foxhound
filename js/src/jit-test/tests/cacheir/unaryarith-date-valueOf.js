load(libdir + "asserts.js");

function test(date) {
  let inc = date;
  let dec = date;
  return [+date, -date, ~date, ++inc, --dec];
}

with ({}) {}

let date = new Date("2000-01-01");
let val = 946684800000;
let expected = [val, -val, ~val, val+1, val-1]

for (var i = 0; i < 2000; i++) {
  if (i == 1750) {
    Object.defineProperty(Date.prototype, "valueOf", {value: () => 3});
    expected = [3, -3, ~3, 4, 2];
  }
  let result = test(date);
  assertDeepEq(result, expected);
}
