/* -*- tab-width: 2; indent-tabs-mode: nil; js-indent-level: 2 -*- */


/**
   Filename:     basicfunctions.js
   Description:  'This tests the new basic tainted functions of strings.'

   Author:       Stephan Pfistner
*/

var SECTION = 'no section';
var VERSION = 'no version';
startTest();
var TITLE = 'Taint:op:concat';


var isit = "is it";
var tainted = String.newAllTainted("tainted");

//test concat in general (C++ impl.)
// no taint if both operands are untainted
var notTainted = isit + isit;
assertEq(notTainted.taint.length, 0);
// left is tainted: should be the same representation
var leftTainted = tainted + isit;
assertEq(leftTainted.taint.length, 1)
assertEq(JSON.stringify(leftTainted.taint), JSON.stringify(tainted.taint));
// right is tainted: offsets should be changed
var lenLeft = isit.length;
var rightTainted = isit + tainted;
assertEq(rightTainted.taint.length, 1);
assertEq(rightTainted.taint[0].begin, isit.length);
assertEq(rightTainted.taint[0].end, isit.length + tainted.length);
assertEq(JSON.stringify(rightTainted.taint[0].operators), JSON.stringify(tainted.taint[0].operators));

//explicit operator
var explicitConcat = tainted.concat(isit);
assertEq(explicitConcat.taint.length, 1);

//check JIT operation
var add = tainted;
for(var i = 0; i < 100000; i++) {
	add = i + add;
}
assertEq(add.taint.length, 1);

if (typeof reportCompare === "function")
  reportCompare(true, true);