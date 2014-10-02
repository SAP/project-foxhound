load("taint/taint-setup.js");

//contains quote, toSource and uneval

var taint = _MultiTaint();
var quoted = taint.quote();
var sourced = taint.toSource();
var unevaled = uneval(taint);

//still 2 taints, no splitting
assertEq(quoted.taint.length, 2);

//taint starting at 0 shifted by 1 for the prepended "
assertEq(quoted.taint[0].begin, 1);
//end also +1, but the unicode char has been encoded into 6 chars (5+6+1)
assertEq(quoted.taint[0].end, 12);
_hasLastOp(quoted.taint[0], "quote");

//second taint shifted for als escaped chars
assertEq(quoted.taint[1].begin, 28)
assertEq(quoted.taint[1].end, 40)

//uneval and quote do the same thing for this string
_equalTaint(quoted, unevaled);

//toSource adds (new String("x"))
assertEq(sourced.taint.length, 2);
assertEq(sourced.taint[0].begin, 13);
assertEq(sourced.taint[0].end, 24); //length should be the same as in quote
assertEq(sourced.taint[1].begin, 40);
assertEq(sourced.taint[1].end, 52); //length should be the same as in quote



reportCompare(true, true);