// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime
description: Time zone IDs are valid input for a time zone
features: [Temporal]
---*/

["UTC", "+01:30"].forEach((timeZone) => {
  const result = new Temporal.ZonedDateTime(0n, timeZone);
  assert.sameValue(result.timeZoneId, timeZone, `time zone ID should be "${timeZone}"`);
});

reportCompare(0, 0);
