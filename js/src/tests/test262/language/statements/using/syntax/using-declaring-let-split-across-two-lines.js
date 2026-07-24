// |reftest| shell-option(--enable-explicit-resource-management) skip-if(!(this.hasOwnProperty('getBuildConfiguration')&&getBuildConfiguration('explicit-resource-management'))||!xulRuntime.shell) -- explicit-resource-management is not enabled unconditionally, requires shell-options
// Copyright (C) 2023 Ron Buckton. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-let-const-using-and-await-using-declarations
description: >
    using: |using let| split across two lines is treated as two statements.
info: |
  Lexical declarations may not declare a binding named "let".
flags: [noStrict]
features: [explicit-resource-management]
---*/

{
  using
  let = "irrelevant initializer";

  assert(typeof let === "string");
  var using, let;
}

reportCompare(0, 0);
