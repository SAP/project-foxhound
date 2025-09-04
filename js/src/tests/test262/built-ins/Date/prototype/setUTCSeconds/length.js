// Copyright (C) 2024 André Bargull. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-date.prototype.setutcseconds
description: >
  Date.prototype.setUTCSeconds.length is 2.
info: |
  Date.prototype.setUTCSeconds ( sec [ , ms ] )

  The "length" property of this method is 2𝔽.

  17 ECMAScript Standard Built-in Objects:
    Unless otherwise specified, the "length" property of a built-in function
    object has the attributes { [[Writable]]: false, [[Enumerable]]: false,
    [[Configurable]]: true }.
includes: [propertyHelper.js]
---*/

verifyProperty(Date.prototype.setUTCSeconds, "length", {
  value: 2,
  writable: false,
  enumerable: false,
  configurable: true,
});

reportCompare(0, 0);
