// |reftest| shell-option(--enable-change-array-by-copy) skip-if(!Array.prototype.with||!xulRuntime.shell) -- change-array-by-copy is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-array.prototype.toSpliced
description: >
  Array.prototype.toSpliced returns a new array even if it the result is equal to the original array
features: [change-array-by-copy]
includes: [compareArray.js]
---*/

var arr = [1, 2, 3];
var spliced = arr.toSpliced(1, 0);
assert.notSameValue(arr, spliced);
assert.compareArray(arr, spliced);

reportCompare(0, 0);
