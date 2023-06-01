// |reftest| skip -- Temporal is not supported
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.instant.prototype.subtract
description: temporalDurationLike object must contain at least one correctly spelled property
features: [Temporal]
---*/

const instance = new Temporal.Instant(1_000_000_000_000_000_000n);

assert.throws(
  TypeError,
  () => instance.subtract({}),
  "Throws TypeError if no property is present"
);

assert.throws(
  TypeError,
  () => instance.subtract({ nonsense: true }),
  "Throws TypeError if no recognized property is present"
);

assert.throws(
  TypeError,
  () => instance.subtract({ sign: 1 }),
  "Sign property is not recognized"
);

reportCompare(0, 0);
