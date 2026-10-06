// |jit-test| --no-blinterp

var longStr = "x".repeat(100) + "abc";
var shortStr = "aaaaaaaaaaa";
var re1 = /abc/;
var re2 = /(a)(a)(a)(a)(a)(a)(a)(a)(a)(a)(a)/;

re1.exec(longStr);

let result = "";
oomTest(function() {
  re1.exec(longStr);
  try {
    re2.exec(shortStr);
  } catch (e) {}
  result = RegExp.lastMatch;
});
