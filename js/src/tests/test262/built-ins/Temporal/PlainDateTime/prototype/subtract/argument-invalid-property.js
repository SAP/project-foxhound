// |reftest| skip -- Temporal is not supported
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaindatetime.prototype.subtract
description: temporalDurationLike object must contain at least one correctly spelled property
features: [Temporal]
---*/

const instance = new Temporal.PlainDateTime(2000, 5, 2, 15, 30, 45, 987, 654, 321);

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
