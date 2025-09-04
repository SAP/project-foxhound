// Copyright (C) 2024 Igalia S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
info: |
  Information
flags: [noStrict]
description: |
  pending
esid: pending
---*/
async function f() {
    let
    await 0;
}

assert.sameValue(true, f instanceof Function);
