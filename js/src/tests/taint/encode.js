load("taint/taint-setup.js");

//match

var taint = _MultiTaint();

//encodeURI
var encURI = encodeURI(taint).taint;
assertEq(encURI.length, 2);
assertEq(encURI[0].begin, 0);
assertEq(encURI[0].end, 14);
assertEq(encURI[0].operators.length, 2);
assertEq(encURI[0].operators[0].op, "encodeURI");
assertEq(encURI[1].begin, 38);
assertEq(encURI[1].end, 52);
assertEq(encURI[1].operators.length, 2);
assertEq(encURI[1].operators[0].op, "encodeURI");

//decodeURI
var decURI = decodeURI(encodeURI(taint)).taint;
//everything but operators should match original taint
assertEq(decURI.length, 2);
assertEq(decURI[0].begin, 0);
assertEq(decURI[0].end, 6);
assertEq(decURI[0].operators.length, 3);
assertEq(decURI[0].operators[0].op, "decodeURI");
assertEq(decURI[1].begin, 20);
assertEq(decURI[1].end, 32);
assertEq(decURI[1].operators.length, 3);
assertEq(decURI[1].operators[0].op, "decodeURI");

//encodeURIComponent
var encURIC = encodeURIComponent(taint).taint;
assertEq(encURIC.length, 2);
assertEq(encURIC[0].begin, 0);
assertEq(encURIC[0].end, 14);
assertEq(encURIC[0].operators.length, 2);
assertEq(encURIC[0].operators[0].op, "encodeURIComponent");
assertEq(encURIC[1].begin, 38);
assertEq(encURIC[1].end, 52);
assertEq(encURIC[1].operators.length, 2);
assertEq(encURIC[1].operators[0].op, "encodeURIComponent");

//decodeURIComponent
var decURIC = decodeURIComponent(encodeURIComponent(taint)).taint;
//everything but operators should match original taint
assertEq(decURIC.length, 2);
assertEq(decURIC[0].begin, 0);
assertEq(decURIC[0].end, 6);
assertEq(decURIC[0].operators.length, 3);
assertEq(decURIC[0].operators[0].op, "decodeURIComponent");
assertEq(decURIC[1].begin, 20);
assertEq(decURIC[1].end, 32);
assertEq(decURIC[1].operators.length, 3);
assertEq(decURIC[1].operators[0].op, "decodeURIComponent");

reportCompare(true, true);