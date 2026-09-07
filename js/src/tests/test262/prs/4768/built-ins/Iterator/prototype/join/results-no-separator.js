// |reftest| shell-option(--enable-iterator-join) skip-if(!Iterator.prototype.join||!xulRuntime.shell) -- Iterator.prototype.join is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 Kevin Gibbons. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-iterator.prototype.join
description: Iterator.prototype.join joins using a comma if no separator is passed.
features: [Iterator.prototype.join]
---*/

assert.sameValue([].values().join(), '');

assert.sameValue(['one'].values().join(), 'one');

assert.sameValue(['one', 'two'].values().join(), 'one,two');

assert.sameValue(['one', 'two', 'three'].values().join(), 'one,two,three');

reportCompare(0, 0);
