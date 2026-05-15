const join = Array.prototype.join;

let obj = { length: 10 };
assertEq(join.call(obj, ""), "");
assertEq(join.call(obj), ",".repeat(9));
assertEq(join.call(obj, "abc"), "abc".repeat(9));

obj = { [0]: 1, length: 10 };
assertEq(join.call(obj, ""), "1");
assertEq(join.call(obj), "1" + ",".repeat(9));
assertEq(join.call(obj, "abc"), "1" + "abc".repeat(9));

obj = { [0]: 1, [1]: 2, [2]: 3, [3]: 4, [4]: 5, length: 2 };
assertEq(join.call(obj), "1,2");
assertEq(join.call(obj, ""), "12");
assertEq(join.call(obj, "abc"), "1abc2");

obj = { [0]: 1, [1]: 2, [2]: {}, [3]: 4, length: 3};
assertEq(join.call(obj), "1,2,[object Object]");
assertEq(join.call(obj, ""), "12[object Object]");
assertEq(join.call(obj, "abc"), "1abc2abc[object Object]");

assertEq(new Array(10).join(""), "");
assertEq(new Array(10).join(), ",".repeat(9));
assertEq(new Array(10).join("abc"), "abc".repeat(9));

assertEq(new Array(100).join(), ",".repeat(99));
assertEq(new Array(100).join(""), "");
assertEq(new Array(100).join("abc"), "abc".repeat(99));

var a = [1];
a.length = 10;
assertEq(a.join(), "1" + ",".repeat(9));
assertEq(a.join(""), "1");
assertEq(a.join("abc"), "1" + "abc".repeat(9));

var a = [1, 2, 3, 4, 5]
a.length = 2;
assertEq(a.join(), "1,2");
assertEq(a.join(""), "12");
assertEq(a.join("abc"), "1abc2");

var a = [1, 2, {}, 4];
a.length = 3;
assertEq(a.join(), "1,2,[object Object]");
assertEq(a.join(""), "12[object Object]");
assertEq(a.join("abc"), "1abc2abc[object Object]");

// Too slow:
// var obj = { [0]: 1, length: 2 ** 33 };
// join.call(obj, "");
