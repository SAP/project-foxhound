// Test taint propagation with string concatenation

var s1 = randomString();
var s2 = randomString();
var t1 = randomTaintedString();
var t2 = randomTaintedString();

assertNotTainted(s1 + s2);
assertTainted(s1 + t1);
assertRangeTainted(s1 + t2, [s1.length, STR_END]);
assertFullTainted(t1 + t2);
assertEq(t1.concat(t2).taint.length, 2);

//check JIT operation
/*var add = tainted;*/
//for(var i = 0; i < 10000; i++) {
	//add = i + add;
//}
//assertEq(add.taint.length, 1);

if (typeof reportCompare === "function")
  reportCompare(true, true);
