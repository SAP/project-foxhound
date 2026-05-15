// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2024 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.prototype.tostring
description: Throws when rounding and total of duration time units is out of range.
features: [Temporal]
---*/

const duration = new Temporal.Duration(0, 0, 0, 1, 0, 0, 2**53 - 1 - (24*60*60), 0, 0, 999_999_999);

assert.throws(RangeError,
              () => duration.toString({ roundingMode: "ceil", fractionalSecondDigits: 7 }));

reportCompare(0, 0);
