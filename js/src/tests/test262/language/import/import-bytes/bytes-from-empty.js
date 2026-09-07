// |reftest| shell-option(--enable-arraybuffer-immutable) shell-option(--enable-import-bytes) skip-if(release_or_beta||!ArrayBuffer.prototype.sliceToImmutable||!xulRuntime.shell) module -- import-bytes is not released yet, immutable-arraybuffer is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 @styfle. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
esid: sec-create-bytes-module
description: Creates bytes module from txt file
flags: [module]
features: [import-attributes, immutable-arraybuffer, import-bytes]
includes: [compareArray.js]
---*/

import value from './bytes-from-empty_FIXTURE.bin' with { type: 'bytes' };

assert(value instanceof Uint8Array);
assert(value.buffer instanceof ArrayBuffer);

assert.sameValue(value.length, 0);
assert.sameValue(value.buffer.byteLength, 0);
assert.sameValue(value.buffer.immutable, true);

assert.compareArray(Array.from(value), []);

assert.throws(TypeError, function() {
  value.buffer.resize(0);
});

assert.throws(TypeError, function() {
  value.buffer.transfer();
});

reportCompare(0, 0);
