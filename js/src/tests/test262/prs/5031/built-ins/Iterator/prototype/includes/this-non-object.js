// |reftest| shell-option(--enable-iterator-includes) skip-if(!Iterator.prototype.includes||!xulRuntime.shell) -- iterator-includes is not enabled unconditionally, requires shell-options
// Copyright (C) 2026 Michael Ficarra. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-iterator.prototype.includes
description: >
  Iterator.prototype.includes throws TypeError when its this value is a non-object
info: |
  Iterator.prototype.includes ( searchElement [ , skippedElements ] )

  1. Let O be the this value.
  2. If O is not an Object, throw a TypeError exception.

features: [iterator-includes]
---*/

assert.throws(TypeError, function() {
  Iterator.prototype.includes.call(null, 0);
});

Object.defineProperty(Number.prototype, 'next', {
  get: function() {
    throw new Test262Error();
  },
});

assert.throws(TypeError, function() {
  Iterator.prototype.includes.call(0, 0);
});

reportCompare(0, 0);
