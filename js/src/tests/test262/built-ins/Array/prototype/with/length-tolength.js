// |reftest| shell-option(--enable-change-array-by-copy) skip-if(!Array.prototype.with||!xulRuntime.shell) -- change-array-by-copy is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-array.prototype.with
description: >
  Array.prototype.with converts the this value length to a number.
info: |
  Array.prototype.with ( index, value )

  ...
  2. Let len be ? LengthOfArrayLike(O).
  ...
features: [change-array-by-copy]
includes: [compareArray.js]
---*/

var arrayLike = { length: "2", 0: 1, 1: 2, 2: 3 };
assert.compareArray(Array.prototype.with.call(arrayLike, 0, 4), [4, 2]);

var arrayLike = {
  length: {
    valueOf: () => 2
  },
  0: 1,
  1: 2,
  2: 3,
};

assert.compareArray(Array.prototype.with.call(arrayLike, 0, 4), [4, 2]);

reportCompare(0, 0);
