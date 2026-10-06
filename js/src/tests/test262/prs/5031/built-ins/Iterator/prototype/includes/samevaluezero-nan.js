// |reftest| shell-option(--enable-iterator-includes) skip-if(!Iterator.prototype.includes||!xulRuntime.shell) -- iterator-includes is not enabled unconditionally, requires shell-options
// Copyright (C) 2026 Michael Ficarra. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-iterator.prototype.includes
description: >
  Includes uses SameValueZero for NaN
features: [iterator-includes]
---*/

let arr = [NaN];

assert.sameValue(arr.values().includes(0), false);
assert.sameValue(arr.values().includes(NaN), true);
assert.sameValue([].values().includes(NaN), false);

reportCompare(0, 0);
