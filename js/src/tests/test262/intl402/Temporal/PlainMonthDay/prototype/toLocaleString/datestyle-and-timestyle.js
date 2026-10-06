// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2026 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plainmonthday.prototype.tolocalestring
description: Using timeStyle, even if dateStyle is present, should throw
features: [Temporal]
---*/

const item = new Temporal.PlainMonthDay(1, 20, "gregory", 1972);

assert.throws(TypeError, function() {
  item.toLocaleString("en-u-ca-gregory", { dateStyle: "full", timeStyle: "full" });
});

reportCompare(0, 0);
