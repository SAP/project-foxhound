load("taint/taint-setup.js");

//match

var taint = _MultiTaint();
var spacesplitidx = [0, 3, 4];

//str
var sstr = taint.split(" ").map(function(r) { return r.taint; });
for(var i = 0; i < spacesplitidx.length; i++) {
	assertEq(sstr[spacesplitidx[i]].length, 1);
	assertEq(sstr[spacesplitidx[i]][0].operators.length, 3);
}
//taintedstr
var ststr = taint.split(_t(" ")).map(function(r) { return r.taint; });
for(var i = 0; i < spacesplitidx.length; i++) {
	assertEq(ststr[spacesplitidx[i]].length, 1);
	assertEq(ststr[spacesplitidx[i]][0].operators.length, 3);
}

//regex
var streg = taint.split(/\w+/).map(function(r) { return r.taint; });
var wordsplitidx = [1, 4];
for(var i = 0; i < wordsplitidx.length; i++) {
	assertEq(streg[wordsplitidx[i]].length, 1);
	assertEq(streg[wordsplitidx[i]][0].operators.length, 3);
}

reportCompare(true, true);