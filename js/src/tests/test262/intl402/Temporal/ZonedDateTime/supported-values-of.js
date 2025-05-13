// |reftest| skip-if(!this.hasOwnProperty('Temporal')) -- Temporal is not enabled unconditionally
// Copyright (C) 2022 André Bargull. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime
description: >
  ZonedDateTime constructor accepts all time zone identifiers from
  Intl.supportedValuesOf.
features: [Temporal, Intl-enumeration]
---*/

// Ensure all identifiers are valid and canonical.
for (let id of Intl.supportedValuesOf("timeZone")) {
  let instance = new Temporal.ZonedDateTime(0n, id);

  assert.sameValue(instance.timeZoneId, id);
}

reportCompare(0, 0);
