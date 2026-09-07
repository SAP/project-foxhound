// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-declarative-environment-records-setmutablebinding-n-v-s
description: >
    using: invalid assignment in Statement body. Since a `using` declaration introduces an immutable
    binding, any attempt to change it results in a TypeError.
features: [explicit-resource-management]
---*/

assert.throws(TypeError, function() {
  for (using x of [null]) { x = { [Symbol.dispose]() { } }; }
});

reportCompare(0, 0);
