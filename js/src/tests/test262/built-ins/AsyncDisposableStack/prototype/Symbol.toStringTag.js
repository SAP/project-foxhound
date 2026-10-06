// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-asyncdisposablestack.prototype-@@toStringTag
description: >
    `Symbol.toStringTag` property descriptor
info: |
    The initial value of the @@toStringTag property is the String value
    'AsyncDisposableStack'.

    This property has the attributes { [[Writable]]: false, [[Enumerable]]:
    false, [[Configurable]]: true }.
includes: [propertyHelper.js]
features: [explicit-resource-management, Symbol, Symbol.toStringTag]
---*/

verifyProperty(AsyncDisposableStack.prototype, Symbol.toStringTag, {
  value: 'AsyncDisposableStack',
  writable: false,
  enumerable: false,
  configurable: true
});

reportCompare(0, 0);
