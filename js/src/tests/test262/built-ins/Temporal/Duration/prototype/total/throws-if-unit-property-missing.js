// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2018 Bloomberg LP. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.prototype.total
description: Throws RangeError if unit property is missing.
features: [Temporal]
---*/

const d = new Temporal.Duration(5, 5, 5, 5, 5, 5, 5, 5, 5, 5);

// throws RangeError if unit property is missing
[
  {},
  () => {
  },
  { roundingMode: "ceil" }
].forEach(roundTo => assert.throws(RangeError, () => d.total(roundTo)));

reportCompare(0, 0);
