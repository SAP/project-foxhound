// |reftest| fails -- byte-exact counting is not implemented 
load("taint/taint-setup.js");

//normalize

var taint = _MultiTaint();

//"canonically decomposed form" will create 2 unicode chars out of our 1
var norm = taint.normalize("NFD");
//this new char should be included in the taint
assertEq(taint.taint.length, norm.taint.length);
assertEq(norm.taint[0].begin, 0);
assertEq(norm.taint[0].end, 7); //!!

reportCompare(true, true);