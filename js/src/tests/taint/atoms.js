/* -*- tab-width: 2; indent-tabs-mode: nil; js-indent-level: 2 -*- */


/**
   Filename:     atoms.js
   Description:  'Check that JSAtom and StaticStrings does not interfere with tainting.'

   Author:       Stephan Pfistner
*/

var SECTION = 'no section';
var VERSION = 'no version';
startTest();
var TITLE = 'Taint:atoms';


var couldbestatic_untaint = "a";
var couldbestatic_taint   = String.newAllTainted("a");
var both=couldbestatic_untaint+couldbestatic_taint;

//taint of the second string should not be applied to first
assertEq(couldbestatic_untaint.taint.length, 0); 
//second should be actually tainted and not referenced from StaticStrings
assertEq(couldbestatic_taint.taint.length, 1); 

if (typeof reportCompare === "function")
  reportCompare(true, true);