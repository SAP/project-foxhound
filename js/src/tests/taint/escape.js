load("taint/taint-setup.js");

//match

var taint = _MultiTaint();

//escape
var escaped = escape(taint).taint;
assertEq(escaped.length, 2);
assertEq(escaped[0].begin, 0);
assertEq(escaped[0].end, 11);
assertEq(escaped[0].operators.length, 2);
assertEq(escaped[0].operators[0].op, "escape");
assertEq(escaped[1].begin, 35);
assertEq(escaped[1].end, 49);
assertEq(escaped[1].operators.length, 2);
assertEq(escaped[1].operators[0].op, "escape");

//unescape
var unescaped = unescape(escape(taint)).taint;
//everything but operators should match original taint
assertEq(unescaped.length, 2);
assertEq(unescaped[0].begin, 0);
assertEq(unescaped[0].end,   6);
assertEq(unescaped[0].operators.length, 3);
assertEq(unescaped[0].operators[0].op, "unescape");
assertEq(unescaped[1].begin,20);
assertEq(unescaped[1].end,  32);
assertEq(unescaped[1].operators.length, 3);
assertEq(unescaped[1].operators[0].op, "unescape");

reportCompare(true, true);