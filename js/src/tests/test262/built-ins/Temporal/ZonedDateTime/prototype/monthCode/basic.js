// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2026 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime.prototype.monthcode
description: monthCode property for ZonedDateTime
features: [Temporal]
---*/

assert.sameValue((new Temporal.ZonedDateTime(0n, "UTC")).monthCode, 'M01');

reportCompare(0, 0);
