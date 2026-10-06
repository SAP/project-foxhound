// |reftest| shell-option(--enable-iterator-join) skip-if(!Iterator.prototype.join||!xulRuntime.shell) -- Iterator.prototype.join is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 Kevin Gibbons. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-iterator.prototype.join
description: Iterator.prototype.join does not close its receiver if the iterator itself throws.
features: [Iterator.prototype.join]
---*/

var gotReturn = false;
var it = {
  next: function () {
    throw new Test262Error();
  },
  get return() {
    gotReturn = true;
  },
};

assert.throws(Test262Error, function () {
  Iterator.prototype.join.call(it);
});

assert.sameValue(gotReturn, false);

reportCompare(0, 0);
