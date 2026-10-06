// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2026 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime.prototype.timezoneid
description: Basic functionality of timeZoneId property
features: [Temporal]
---*/

const instance = new Temporal.ZonedDateTime(0n, "Europe/Madrid", "gregory");
assert.sameValue(instance.timeZoneId, "Europe/Madrid");

reportCompare(0, 0);
