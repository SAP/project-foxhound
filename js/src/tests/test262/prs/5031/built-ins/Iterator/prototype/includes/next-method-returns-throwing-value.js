// |reftest| shell-option(--enable-iterator-includes) skip-if(!Iterator.prototype.includes||!xulRuntime.shell) -- iterator-includes is not enabled unconditionally, requires shell-options
// Copyright (C) 2026 Michael Ficarra. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-iterator.prototype.includes
description: >
  Underlying iterator next returns object with throwing value getter
features: [iterator-includes]
---*/

class ThrowingIterator extends Iterator {
  next() {
    return {
      done: false,
      get value() {
        throw new Test262Error();
      },
    };
  }
}

let iterator = new ThrowingIterator();

assert.throws(Test262Error, function() {
  iterator.includes(0);
});

reportCompare(0, 0);
