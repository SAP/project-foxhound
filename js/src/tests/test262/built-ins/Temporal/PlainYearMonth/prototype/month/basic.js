// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2026 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-get-temporal.plainyearmonth.prototype.month
description: Month property for PlainYearMonth
features: [Temporal]
---*/

assert.sameValue((new Temporal.PlainYearMonth(1999, 6)).month, 6);


reportCompare(0, 0);
