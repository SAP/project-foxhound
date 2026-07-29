// |reftest| shell-option(--enable-iterator-join) skip-if(!Iterator.prototype.join||!xulRuntime.shell) -- Iterator.prototype.join is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 Kevin Gibbons. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-iterator.prototype.join
description: Iterator.prototype.join coerces the passed separator to a string.
features: [Iterator.prototype.join]
---*/

var called = false;
var coercible = {
  toString: function () {
    if (called) {
      throw new Test262Error('toString should be called exactly once');
    }
    called = true;
    return '&&';
  },
};

assert.sameValue(['one', 'two', 'three'].values().join(coercible), 'one&&two&&three');
assert(called);

assert.sameValue(['one', 'two', 'three'].values().join(undefined), 'one,two,three');

assert.sameValue(['one', 'two', 'three'].values().join(null), 'onenulltwonullthree');

reportCompare(0, 0);
