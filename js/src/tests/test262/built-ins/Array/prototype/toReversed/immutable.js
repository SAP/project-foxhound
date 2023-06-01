// |reftest| shell-option(--enable-change-array-by-copy) skip-if(!Array.prototype.with||!xulRuntime.shell) -- change-array-by-copy is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-array.prototype.toReversed
description: >
  Array.prototype.toReversed does not mutate its this value
features: [change-array-by-copy]
includes: [compareArray.js]
---*/

var arr = [0, 1, 2];
arr.toReversed();

assert.compareArray(arr, [0, 1, 2]);
assert.notSameValue(arr.toReversed(), arr);

reportCompare(0, 0);
