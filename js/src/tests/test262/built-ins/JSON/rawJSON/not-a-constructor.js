// |reftest| shell-option(--enable-json-parse-with-source) skip-if(!JSON.hasOwnProperty('isRawJSON')||!xulRuntime.shell) -- json-parse-with-source is not enabled unconditionally, requires shell-options
// Copyright (C) 2024 Igalia S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-ecmascript-standard-built-in-objects
description: >
  JSON.rawJSON does not implement [[Construct]], is not new-able
info: |
  ECMAScript Function Objects

  Built-in function objects that are not identified as constructors do not
  implement the [[Construct]] internal method unless otherwise specified in
  the description of a particular function.

  sec-evaluatenew

  ...
  7. If IsConstructor(constructor) is false, throw a TypeError exception.
  ...
includes: [isConstructor.js]
features: [json-parse-with-source, Reflect.construct]
---*/

assert.sameValue(isConstructor(JSON.rawJSON), false, 'isConstructor(JSON.rawJSON) must return false');

assert.throws(TypeError, () => {
  new JSON.rawJSON();
});

reportCompare(0, 0);
