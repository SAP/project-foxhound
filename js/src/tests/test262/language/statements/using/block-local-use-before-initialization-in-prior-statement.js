// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-declarative-environment-records-getbindingvalue-n-s
description: >
    using: block local use before initialization in prior statement.
    (TDZ, Temporal Dead Zone)
features: [explicit-resource-management]
---*/

assert.throws(ReferenceError, function() {
  {
    x; using x = null;
  }
});

reportCompare(0, 0);
