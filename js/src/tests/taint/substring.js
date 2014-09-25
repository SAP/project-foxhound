/* -*- tab-width: 2; indent-tabs-mode: nil; js-indent-level: 2 -*- */


/**
   Filename:     basicfunctions.js
   Description:  'This tests the new basic tainted functions of strings.'

   Author:       Stephan Pfistner
*/

load("taint/taint-setup.js");
startTest();

var tainted = "is it" + String.newAllTainted("tainted");
_isTainted(tainted);

//substring
// full non taint
assertEq(tainted.substring(0,5).taint.length, 0);
// full taint
var fulltaint=tainted.substring(5,10).taint;
assertEq(fulltaint.length, 1);
assertEq(fulltaint[0].begin, 0); //after substring indices are relative to the new string not the old
assertEq(fulltaint[0].end, 5);
assertEq(fulltaint[0].operators.length, 2);
assertEq(fulltaint[0].operators[0].op, "substring");
assertEq(fulltaint[0].operators[0].param1, 5); //this should be the absolute start
assertEq(fulltaint[0].operators[0].param2, 10); // and end
// half
var halftaint=tainted.substring(3,8).taint;
assertEq(halftaint.length, 1);
assertEq(halftaint[0].begin, 2);
assertEq(halftaint[0].end, 5);
assertEq(halftaint[0].operators[0].param1, 3); //this should be the absolute start
assertEq(halftaint[0].operators[0].param2, 8); // and end

//substr
// substr's second parameter is relative, calculate absolute for taint
assertEq(JSON.stringify(tainted.substr(5,5).taint), JSON.stringify(fulltaint));
assertEq(JSON.stringify(tainted.substr(3,5).taint), JSON.stringify(halftaint));

//slice behaves like substring
assertEq(JSON.stringify(tainted.slice(5,10).taint), JSON.stringify(fulltaint));
assertEq(JSON.stringify(tainted.slice(3,8).taint), JSON.stringify(halftaint));

//charAt/single char access behaves like substring(x, 1)
assertEq(JSON.stringify(tainted.substring(3, 1).taint), JSON.stringify(tainted.charAt(3).taint));
assertEq(JSON.stringify(tainted.substring(3, 1).taint), JSON.stringify(tainted[3].taint));

//TODO!
//assertEq(tainted[6].taint.length, 1);
//assertEq(JSON.stringify(tainted[6].taint), JSON.stringify(tainted[6].taint));

reportCompare(true, true);