/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Operations must be recorded once, on the result, in every tier. Each call
// site is warmed on untainted input first, so the JIT paths are in place when
// tainted input arrives. Run this under every tier configuration:
// jstests.py --jitflags=all non262/taint

var WARMUP = 3000;

function warm(f, input) {
  for (var i = 0; i < WARMUP; i++)
    f(input);
}

// Largest number of times |name| occurs in the flow of any one range.
function countOp(str, name) {
  var max = 0;
  for (var r of str.taint)
    max = Math.max(max, r.flow.filter(op => op.operation === name).length);
  return max;
}

// The replace inline cache recorded the operation a second time.
function replaceOnceTest() {
  function f(s) { return s.replace("a", "b"); }
  warm(f, "untainted");
  for (var i = 0; i < 100; i++)
    assertEq(countOp(f(taint("tainted")), "replace"), 1);
}

// Operation names per range, leaving out the "function" operations that
// passing the string to the test's own helpers records.
function opNames(str) {
  return str.taint.map(r => r.flow.map(op => op.operation)
                                   .filter(name => name !== "function"));
}

// Operations that return one of their inputs unchanged must not record on it.
function checkInputNotModified(cases) {
  for (var [f, make] of cases) {
    warm(f, "untainted --------------------------------");
    for (var i = 0; i < 100; i++) {
      var input = make();
      var before = JSON.stringify(opNames(input));
      var res = f(input);
      assertTainted(res);
      assertEq(JSON.stringify(opNames(input)), before);
    }
  }
}

var flat = () => taint("tainted");

function concatEmptyTest() {
  checkInputNotModified([
    [s => s + "", flat],
    [s => "" + s, flat],
    [s => s.concat(""), flat],
  ]);
}

var rope = () => taint("tainted") + "--------------------------------";

function fullRopeSubstringTest() {
  checkInputNotModified([
    [s => s.substring(0), rope],
    [s => s.slice(0), rope],
    [s => s.substr(0), rope],
  ]);
}

replaceOnceTest();
concatEmptyTest();
fullRopeSubstringTest();

if (typeof reportCompare === "function")
  reportCompare(true, true);
