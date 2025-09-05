// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.zoneddatetime.prototype.with
description: Invalid disambiguation.
features: [Temporal]
---*/

const zdt = new Temporal.ZonedDateTime(0n, "UTC");

[
  "",
  "PREFER",
  "balance"
].forEach(offset => assert.throws(RangeError, () => zdt.with({ day: 5 }, { offset })));

reportCompare(0, 0);
