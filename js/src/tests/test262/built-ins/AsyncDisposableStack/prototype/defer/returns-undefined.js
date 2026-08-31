// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-asyncdisposablestack.prototype.defer
description: Returns undefined.
info: |
  AsyncDisposableStack.prototype.defer ( onDisposeAsync )

  ...
  6. Return undefined.

features: [explicit-resource-management]
---*/

var stack = new AsyncDisposableStack();
assert.sameValue(stack.defer(_ => {}), undefined);

reportCompare(0, 0);
