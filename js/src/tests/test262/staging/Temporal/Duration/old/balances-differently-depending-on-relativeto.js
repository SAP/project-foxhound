// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2018 Bloomberg LP. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.prototype.total
description: Balances differently depending on relativeTo.
features: [Temporal]
---*/

const fortyDays = new Temporal.Duration(0, 0, 0, 40, 0, 0, 0, 0, 0, 0);
const negativeFortyDays = new Temporal.Duration(0, 0, 0, -40, 0, 0, 0, 0, 0, 0);

assert.sameValue(fortyDays.total({
  unit: "months",
  relativeTo: new Temporal.PlainDate(2020, 2, 1)
}).toPrecision(16), (1 + 11 / 31).toPrecision(16));
assert.sameValue(fortyDays.total({
  unit: "months",
  relativeTo: new Temporal.PlainDate(2020, 1, 1)
}).toPrecision(16), (1 + 9 / 29).toPrecision(16));

// balances differently depending on relativeTo (negative)
assert.sameValue(negativeFortyDays.total({
  unit: "months",
  relativeTo: new Temporal.PlainDate(2020, 3, 1)
}).toPrecision(16), (-(1 + 11 / 31)).toPrecision(16));
assert.sameValue(negativeFortyDays.total({
  unit: "months",
  relativeTo: new Temporal.PlainDate(2020, 4, 1)
}).toPrecision(16), (-(1 + 9 / 29)).toPrecision(16));

reportCompare(0, 0);
