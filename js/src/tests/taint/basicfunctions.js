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


//Plain new strings should be untainted
var untaintedStr = "is it tainted?";
assertEq(untaintedStr.taint.length, 0);


//Explicit tainted string should be tainted
//also test basic source reporting here
var taintedStr = String.newAllTainted(untaintedStr);
assertEq(untaintedStr.taint.length, 0); //check if untaintedStr is still untainted after copy
assertEq(taintedStr.taint.length, 1); //tainted copy should have a taint attached
var taintEntry = taintedStr.taint[0];
assertEq(taintEntry.begin, 0); //which spans the whole string
assertEq(taintEntry.end, taintedStr.length);
assertEq(taintEntry.operators.length, 1); //one op
assertEq(taintEntry.operators[0].op.length > 0, true); //which has a name set
assertEq("param" in taintEntry.operators[0], true); //param exists
assertEq(taintEntry.operators[0].param, undefined); //no param set

//untainted and tained strings should equal the same by basic comparison
assertEq(untaintedStr == taintedStr, true);

//untaint should work
taintedStr.untaint();
assertEq(taintedStr.taint.length, 0);


if (typeof reportCompare === "function")
  reportCompare(true, true);