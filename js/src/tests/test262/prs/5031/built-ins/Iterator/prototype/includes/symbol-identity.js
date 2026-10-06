// |reftest| shell-option(--enable-iterator-includes) skip-if(!Iterator.prototype.includes||!xulRuntime.shell) -- iterator-includes is not enabled unconditionally, requires shell-options
// Copyright (C) 2026 Michael Ficarra. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-iterator.prototype.includes
description: >
  Includes compares symbols by identity
features: [iterator-includes]
---*/

let s = Symbol('test');
let arr = [s];

assert.sameValue(arr.values().includes(Symbol('test')), false);
assert.sameValue(arr.values().includes(s), true);
assert.sameValue([].values().includes(s), false);

reportCompare(0, 0);
