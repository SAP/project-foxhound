load("taint/taint-setup.js");

//toLowerCase, toUpperCase, trim, repeat, normalize

var taint = _MultiTaint();

//everything but the ops should be the same
var low = taint.toLowerCase();
var up = taint.toUpperCase();
assertEq(taint.taint.length, low.taint.length);
assertEq(taint.taint[0].begin, low.taint[0].begin);
assertEq(taint.taint[0].end, low.taint[0].end);
assertEq(taint.taint[1].begin, low.taint[1].begin);
assertEq(taint.taint[1].end, low.taint[1].end);
assertEq(taint.taint.length, up.taint.length);
assertEq(taint.taint[0].begin, up.taint[0].begin);
assertEq(taint.taint[0].end, up.taint[0].end);
assertEq(taint.taint[1].begin, up.taint[1].begin);
assertEq(taint.taint[1].end, up.taint[1].end);


var taintspace = _t("  ") + taint + _t("  ");
var taintnospace = taint;
var trim1 = taintspace.trim();
var trim2 = taintnospace.trim();

//everything but the ops should be back as before after trim
assertEq(taint.taint.length, trim1.taint.length);
assertEq(taint.taint[0].begin, trim1.taint[0].begin);
assertEq(taint.taint[0].end, trim1.taint[0].end);
assertEq(taint.taint[1].begin, trim1.taint[1].begin);
assertEq(taint.taint[1].end, trim1.taint[1].end);
//no spaces trimmed -> nothing changed
_equalTaint(taint, trim2);


var rep = taint.repeat(3);
assertEq(rep.taint.length, taint.taint.length*3);

reportCompare(true, true);