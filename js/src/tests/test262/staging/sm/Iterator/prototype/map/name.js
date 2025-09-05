// |reftest| shell-option(--enable-iterator-helpers) skip-if(!this.hasOwnProperty('Iterator')||!xulRuntime.shell) -- iterator-helpers is not enabled unconditionally, requires shell-options
// Copyright (C) 2024 Mozilla Corporation. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: pending
description: |
  %Iterator.prototype%.map.name value and descriptor.
info: |
  17 ECMAScript Standard Built-in Objects
features:
- iterator-helpers
includes: [sm/non262-shell.js, sm/non262.js]
flags:
- noStrict
---*/
assert.sameValue(Iterator.prototype.map.name, 'map');

const propertyDescriptor = Reflect.getOwnPropertyDescriptor(Iterator.prototype.map, 'name');
assert.sameValue(propertyDescriptor.value, 'map');
assert.sameValue(propertyDescriptor.enumerable, false);
assert.sameValue(propertyDescriptor.writable, false);
assert.sameValue(propertyDescriptor.configurable, true);


reportCompare(0, 0);
