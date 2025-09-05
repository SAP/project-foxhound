// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2024 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
description: Test developer exposed AsyncDisposableStack protype method move.
features: [explicit-resource-management]
---*/

// Two stacks should not be the same --------
(function TestAsyncDisposableStackMoveNotSameObjects() {
  let stack = new AsyncDisposableStack();
  const firstDisposable = {
    value: 1,
    [Symbol.asyncDispose]() {
      return 42;
    }
  };
  const secondDisposable = {
    value: 2,
    [Symbol.asyncDispose]() {
      return 43;
    }
  };
  stack.use(firstDisposable);
  stack.use(secondDisposable);
  let newStack = stack.move();
  assert.notSameValue(stack, newStack);
})();

reportCompare(0, 0);
