// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.from
description: The receiver is never called when calling from()
includes: [temporalHelpers.js]
features: [Temporal]
---*/

TemporalHelpers.checkSubclassingIgnoredStatic(
  Temporal.Duration,
  "from",
  ["P1Y2M3W4DT5H6M7.987654321S"],
  (result) => TemporalHelpers.assertDuration(result, 1, 2, 3, 4, 5, 6, 7, 987, 654, 321),
);

reportCompare(0, 0);
