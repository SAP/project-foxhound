// |reftest| shell-option(--enable-iterator-join) skip-if(!Iterator.prototype.join||!xulRuntime.shell) -- Iterator.prototype.join is not enabled unconditionally, requires shell-options
// Copyright (C) 2025 Kevin Gibbons. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-iterator.prototype.join
description: Iterator.prototype.join has default data property attributes.
includes: [propertyHelper.js]
features: [Iterator.prototype.join]
---*/

verifyProperty(Iterator.prototype, 'join', {
  enumerable: false,
  writable: true,
  configurable: true
});

reportCompare(0, 0);
