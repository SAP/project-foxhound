// Copyright 2009 the Sputnik authors.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
info: The production x /= y is the same as x = x / y
es5id: 11.13.2_A4.2_T2.6
description: >
    Type(x) is different from Type(y) and both types vary between
    String (primitive or object) and Undefined
---*/

var x;

//CHECK#1
x = "1";
x /= undefined;
if (isNaN(x) !== true) {
  throw new Test262Error('#1: x = "1"; x /= undefined; x === Not-a-Number. Actual: ' + (x));
}

//CHECK#2
x = undefined;
x /= "1";
if (isNaN(x) !== true) {
  throw new Test262Error('#2: x = undefined; x /= "1"; x === Not-a-Number. Actual: ' + (x));
}

//CHECK#3
x = new String("1");
x /= undefined;
if (isNaN(x) !== true) {
  throw new Test262Error('#3: x = new String("1"); x /= undefined; x === Not-a-Number. Actual: ' + (x));
}

//CHECK#4
x = undefined;
x /= new String("1");
if (isNaN(x) !== true) {
  throw new Test262Error('#4: x = undefined; x /= new String("1"); x === Not-a-Number. Actual: ' + (x));
}

reportCompare(0, 0);
