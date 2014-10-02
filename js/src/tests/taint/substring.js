load("taint/taint-setup.js");
startTest();

var tainted = _MultiTaint();
_isTainted(tainted);

//substring
// full non taint
_isNotTainted(tainted.substring(b.length,b.length+m.length));
// full taint
var endtaint = tainted.substring(b.length+m.length, tainted.length);
_isTainted(tainted.substring(0, b.length));
_isTainted(endtaint);
assertEq(endtaint.taint.length, 1);
assertEq(endtaint.taint[0].begin, 0); //after substring indices are relative to the new string not the old
assertEq(endtaint.taint[0].end, e.length);
assertEq(endtaint.taint[0].operators.length, 1); //we did a substring, but as this part was a tainted string by itself no real "substring was done"
// multi taint
var multitaint = tainted.substring(2, tainted.length-2);
assertEq(multitaint.taint.length, 2);
assertEq(multitaint.taint[0].begin, 0);
assertEq(multitaint.taint[0].end, b.length-2); //as we started on idx 2, taint is 2 chars shorter now
assertEq(multitaint.taint[0].operators.length, 2);
assertEq(multitaint.taint[0].operators[0].op, "substring");
assertEq(multitaint.taint[0].operators[0].param1, 2); //this should be the absolute start of this part
assertEq(multitaint.taint[0].operators[0].param2, b.length); // and end
assertEq(multitaint.taint[1].begin, b.length+m.length-2)
assertEq(multitaint.taint[1].end, tainted.length-4) //we chopped of 2 chars from both ends

//substr
// substr's second parameter is relative, calculate absolute for taint
_equalTaint(tainted.substr(2,tainted.length-4), multitaint);

//slice behaves like substring
_equalTaint(tainted.slice(2,tainted.length-2), multitaint);

reportCompare(true, true);