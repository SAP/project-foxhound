load(libdir + "eqArrayHelper.js");

// Subclass to test non-optimizable-RegExp path.
class MyRegExp extends RegExp {}

function testSplit() {
  var str = "a\u{1F600}b";
  var regexps = [
    /(?:)/u, new MyRegExp("", "u"),
    /(?:)/v, new MyRegExp("", "v"),
  ];
  for (var re of regexps) {
    assertEqArray(str.split(re), ["a", "\u{1F600}", "b"]);
  }
}
testSplit();

function testGlobalReplace() {
  var str = "a\u{1F600}b";
  var regexps = [
    /((?:))/gu, new MyRegExp("()", "gu"),
    /((?:))/gv, new MyRegExp("()", "gv"),
  ];
  for (var re of regexps) {
    assertEq(str.replace(re, "-"), "-a-\u{1F600}-b-");
    assertEq(str.replace(re, () => "-"), "-a-\u{1F600}-b-");
    assertEq(str.replace(re, "-$1-"), "--a--\u{1F600}--b--");
  }
}
testGlobalReplace();
