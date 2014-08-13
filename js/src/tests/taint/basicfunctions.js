/* -*- tab-width: 2; indent-tabs-mode: nil; js-indent-level: 2 -*- */


/**
   Filename:     basicfunctions.js
   Description:  'This tests the new basic tainted functions of strings.'

   Author:       Stephan Pfistner
*/

var SECTION = 'no section';
var VERSION = 'no version';
startTest();
var TITLE = 'Taint:basic';


//plain new strings should be untainted
var untaintedStr = "is it tainted?";
assertEq(untaintedStr.taint.length, 0);


//Explicit tainted string should be tainted
//also test basic source reporting here
//[{begin:0, end:4, operators:[{op:"Manual Taint", param:(void 0)}]}]
var taintedStr = String.newAllTainted("is it tainted?");
assertEq(taintedStr.taint.length, 1); //tainted copy should have a taint attached
assertEq(taintedStr.taint[0].begin, 0); 
assertEq(taintedStr.taint[0].end, taintedStr.length); // spans the whole string
assertEq(taintedStr.taint[0].operators.length, 1); //one op
assertEq(taintedStr.taint[0].operators[0].op.length > 0, true); //which has a name set
assertEq("param" in taintedStr.taint[0].operators[0], true); //param exists
assertEq(taintedStr.taint[0].operators[0].param, undefined); //no param set

//String copy should work:
//new string tainted, source remains untainted
var taintStrCopySrc = "is it tainted?"
var taintStrCopy = String.newAllTainted(taintStrCopySrc);
assertEq(taintStrCopySrc.taint.length, 0);
assertEq(taintStrCopy.taint.length, 1);
//untainted and tained strings should equal the same by basic comparison
assertEq(taintStrCopySrc === taintStrCopy, true);


//untaint should work
var taintStrUntaint = String.newAllTainted("is it tainted?");
taintStrUntaint.untaint();
assertEq(taintStrUntaint.taint.length, 0);


//Mutator should add an OP, while taints itself remain the same
//also check that parameter setting works
//[{begin:0, end:4, operators:[{op:"Mutation activated!", param:"String parameter incoming!"}, {op:"Manual Taint", param:(void 0)}]}]
var taintStrMutator = String.newAllTainted("is it tainted?");
taintStrMutator.mutateTaint();
assertEq(taintStrMutator.taint.length, 1);
assertEq(taintStrMutator.taint[0].begin, 0);
assertEq(taintStrMutator.taint[0].end, taintStrMutator.length);
assertEq(taintStrMutator.taint[0].operators.length, 3);
print(JSON.stringify(taintStrMutator.taint));
assertEq(taintStrMutator.taint[0].operators[0].op.length > 0, true);
assertEq(taintStrMutator.taint[0].operators[0].param == null, true);


if (typeof reportCompare === "function")
  reportCompare(true, true);