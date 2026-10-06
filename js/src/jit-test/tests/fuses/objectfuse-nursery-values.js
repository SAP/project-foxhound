// |jit-test| --fast-warmup

var bigintNursery = BigInt(123);
var stringNursery = "foobarbaz".substring(1);
var objectNursery = "a,b,c".split(",");

var bigintTenured = 1n;
var stringTenured = "a";
var objectTenured = Math;

function f() {
  var res = 0;
  for (var i = 0; i < 200; i++) {
    res += (bigintNursery !== 0n);
    res += (stringNursery !== "foobarbaz");
    res += (typeof objectNursery !== "string");
    res += (bigintTenured !== 0n);
    res += (stringTenured !== "b");
    res += (typeof objectTenured !== "string");
  }
  assertEq(res, 1200);
}
f();
