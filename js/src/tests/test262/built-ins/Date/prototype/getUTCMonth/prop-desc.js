// Copyright (C) 2024 André Bargull. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-date.prototype.getutcmonth
description: >
  Property descriptor for Date.prototype.getUTCMonth.
info: |
  Date.prototype.getUTCMonth ( )

  17 ECMAScript Standard Built-in Objects:
    Every other data property described in clauses 19 through 28 and in
    Annex B.2 has the attributes { [[Writable]]: true, [[Enumerable]]: false,
    [[Configurable]]: true } unless otherwise specified.
includes: [propertyHelper.js]
---*/

verifyProperty(Date.prototype, "getUTCMonth", {
  writable: true,
  enumerable: false,
  configurable: true,
});

reportCompare(0, 0);
