load("taint/taint-setup.js");

//match

var taint = _MultiTaint();


var str = JSON.stringify(taint).taint;
assertEq(str.length, 2);
assertEq(str[0].begin, 1);
assertEq(str[0].end, 7);
assertEq(str[0].operators.length, 4);
assertEq(str[0].operators[0].op, "JSON.stringify");
assertEq(str[1].begin, 23);
assertEq(str[1].end, 35);
assertEq(str[1].operators.length, 3);
assertEq(str[1].operators[0].op, "JSON.stringify");

var parse = JSON.parse(JSON.stringify(taint)).taint;
//everything but operators should match original taint
assertEq(parse.length, 2);
assertEq(parse[0].begin, 0);
assertEq(parse[0].end, 6);
assertEq(parse[0].operators.length, 5);
assertEq(parse[0].operators[0].op, "JSON.parse");
assertEq(parse[1].begin, 20);
assertEq(parse[1].end, 32);
assertEq(parse[1].operators.length, 4);
assertEq(parse[1].operators[0].op, "JSON.parse");

//parse a tainted JSON where the taint starts before the actual
//string literal
var parse2 = JSON.parse(_t("{\"abc\": \"Tainted")+_t("Value\"}")).abc.taint
assertEq(parse2.length, 2);
assertEq(parse2[0].begin, 0);
assertEq(parse2[0].end, 7);
assertEq(parse2[0].operators.length, 3);
assertEq(parse2[0].operators[0].op, "JSON.parse");
assertEq(parse2[1].begin, 7);
assertEq(parse2[1].end, 12);
assertEq(parse2[1].operators.length, 3);
assertEq(parse2[1].operators[0].op, "JSON.parse");

reportCompare(true, true);