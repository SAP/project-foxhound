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


//taint copy allocator should work
//new string tainted, source remains untainted
var taintStrCopySrc = "is it tainted?"
var taintStrCopy = String.newAllTainted(taintStrCopySrc);
assertEq(taintStrCopySrc.taint.length, 0);
assertEq(taintStrCopy.taint.length, 1);
//untainted and tained strings should equal the same by comparison
assertEq(taintStrCopySrc === taintStrCopy, true);


//untaint should work
//[]
var taintStrUntaint = String.newAllTainted("is it tainted?");
taintStrUntaint.untaint();
assertEq(taintStrUntaint.taint.length, 0);


//Test mutators should add one op with a string param and one w/o any param
//mirror mutator is not tested here, see concat operator test
//[{begin:0, end:14, operators:[{op:"Mutation w/o param", param:(void 0)}, {op:"Mutation with param", param:"String parameter"}, {op:"Manual Taint", param:(void 0)}]}]
var taintStrMutator = String.newAllTainted("is it tainted?");
taintStrMutator.mutateTaint();
assertEq(taintStrMutator.taint.length, 1); // one taintref
assertEq(taintStrMutator.taint[0].begin, 0); 
assertEq(taintStrMutator.taint[0].end, taintStrMutator.length); //spans the whole string
assertEq(taintStrMutator.taint[0].operators.length, 3); // source + 2 mutating OPs
//the list is built backwards, so start w/o param
assertEq(taintStrMutator.taint[0].operators[0].op.length > 0, true);
assertEq(taintStrMutator.taint[0].operators[0].param, undefined);
//now check the OP with param
assertEq(taintStrMutator.taint[0].operators[1].op.length > 0, true);
assertEq(typeof taintStrMutator.taint[0].operators[1].param, "string");
assertEq(taintStrMutator.taint[0].operators[1].param.length > 0, true);
//source op is already checked above

//check JIT operation
for(var i = 0; i < 100000; i++) {
  var z = String.newAllTainted("is it tainted?");
}

if (typeof reportCompare === "function")
  reportCompare(true, true);