// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) async -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-declarative-environment-records-getbindingvalue-n-s
description: >
    await using: function local use before initialization in declaration statement.
    (TDZ, Temporal Dead Zone)
flags: [async]
includes: [asyncHelpers.js]
features: [explicit-resource-management]
---*/
asyncTest(async function () {
  await assert.throwsAsync(ReferenceError, async function() {
    await using x = x + 1;
  });
});
