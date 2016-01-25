load("taint/taint-setup.js");
startTest();

var tainted = _MultiTaint();
assertTainted(tainted);

// Verify that inner substring is not tainted
assertNotTainted(tainted.substring(b.length,b.length+m.length));

// Verify that first and last part of the string is fully tainted
var endtaint = tainted.substring(b.length+m.length, tainted.length);
assertFullTainted(tainted.substring(0, b.length));
assertFullTainted(endtaint);

assertEq(endtaint.taint.length, 1);
assertEq(endtaint.taint[0].begin, 0); //after substring indices are relative to the new string not the old
assertEq(endtaint.taint[0].end, e.length);

// multi taint
var multitaint = tainted.substring(2, tainted.length-2);
assertEq(multitaint.taint.length, 2);
assertEq(multitaint.taint[0].begin, 0);
assertEq(multitaint.taint[0].end, b.length-2); //as we started on idx 2, taint is 2 chars shorter now
assertEq(multitaint.taint[0].operators[0].op, "substring");
assertEq(multitaint.taint[0].operators[0].param1, "2"); //this should be the absolute start of this part
assertEq(multitaint.taint[0].operators[0].param2, "" + b.length); // and end
assertEq(multitaint.taint[1].begin, b.length+m.length-2)
assertEq(multitaint.taint[1].end, tainted.length-4) //we chopped of 2 chars from both ends

//substr
// substr's second parameter is relative, calculate absolute for taint
var substrtaint = tainted.substr(2,tainted.length-4).taint;
assertEq(multitaint.taint.length, substrtaint.length);
for(var i = 0; i < multitaint.taint.length; i++) {
	assertEq(multitaint.taint[i].begin, substrtaint[i].begin);
	assertEq(multitaint.taint[i].end, substrtaint[i].end);
	assertEq(substrtaint[i].operators.length >= 1, true);
	assertEq(substrtaint[i].operators[0].op, "substring");
}

//slice behaves like substring
var slicetaint = tainted.slice(2,tainted.length-2).taint;
assertEq(multitaint.taint.length, slicetaint.length);
for(var i = 0; i < multitaint.taint.length; i++) {
	assertEq(multitaint.taint[i].begin, slicetaint[i].begin);
	assertEq(multitaint.taint[i].end, slicetaint[i].end);
	assertEq(slicetaint[i].operators.length >= 1, true);
	assertEq(slicetaint[i].operators[0].op, "substring");
}

reportCompare(true, true);
