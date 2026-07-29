// GENERATED, DO NOT EDIT
// file: nativeErrors.js
// Copyright (C) 2026 Jordan Harband. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: |
    Arrays of language-specified Error constructors, plus a helper that
    constructs a sample instance with appropriate arguments for the
    constructor's signature.

    `nativeErrors` contains every Error constructor whose first argument
    is a `message` string: %Error% and the six NativeErrors.

    `allErrorConstructors` additionally includes %AggregateError% and
    %SuppressedError% when present in the host. Their constructors have
    different signatures (`(errors, message)` and
    `(error, suppressed, message)` respectively), so tests that just
    iterate as `new Ctor(message)` should prefer `nativeErrors`; tests
    that need to cover every Error-like constructor should use
    `allErrorConstructors` together with `makeNativeError`.
defines: [nativeErrors, allErrorConstructors, makeNativeError]
---*/

var nativeErrors = [
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError
];

var allErrorConstructors = nativeErrors.slice();
if (typeof AggregateError !== 'undefined') {
  allErrorConstructors.push(AggregateError);
}
if (typeof SuppressedError !== 'undefined') {
  allErrorConstructors.push(SuppressedError);
}

function makeNativeError(Ctor, useNew) {
  if (typeof AggregateError !== 'undefined' && Ctor === AggregateError) {
    return useNew
      ? new AggregateError([new Error('inner')], 'msg')
      : AggregateError([new Error('inner')], 'msg');
  }
  if (typeof SuppressedError !== 'undefined' && Ctor === SuppressedError) {
    return useNew
      ? new SuppressedError(new Error('inner'), new Error('suppressed'), 'msg')
      : SuppressedError(new Error('inner'), new Error('suppressed'), 'msg');
  }
  return useNew ? new Ctor('msg') : Ctor('msg');
}

// file: proxyTrapsHelper.js
// Copyright (C) 2016 Jordan Harband.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: |
    Used to assert the correctness of object behavior in the presence
    and context of Proxy objects.
defines: [allowProxyTraps]
---*/

function allowProxyTraps(overrides, label) {
  var prefix = typeof label === 'string' && label.length > 0 ? label + ': ' : '';
  function throwTest262Error(msg) {
    return function () { Test262Error.thrower(prefix + msg); };
  }
  if (!overrides) { overrides = {}; }
  return {
    getPrototypeOf: overrides.getPrototypeOf || throwTest262Error('[[GetPrototypeOf]] trap called'),
    setPrototypeOf: overrides.setPrototypeOf || throwTest262Error('[[SetPrototypeOf]] trap called'),
    isExtensible: overrides.isExtensible || throwTest262Error('[[IsExtensible]] trap called'),
    preventExtensions: overrides.preventExtensions || throwTest262Error('[[PreventExtensions]] trap called'),
    getOwnPropertyDescriptor: overrides.getOwnPropertyDescriptor || throwTest262Error('[[GetOwnProperty]] trap called'),
    has: overrides.has || throwTest262Error('[[HasProperty]] trap called'),
    get: overrides.get || throwTest262Error('[[Get]] trap called'),
    set: overrides.set || throwTest262Error('[[Set]] trap called'),
    deleteProperty: overrides.deleteProperty || throwTest262Error('[[Delete]] trap called'),
    defineProperty: overrides.defineProperty || throwTest262Error('[[DefineOwnProperty]] trap called'),
    enumerate: throwTest262Error('[[Enumerate]] trap called: this trap has been removed'),
    ownKeys: overrides.ownKeys || throwTest262Error('[[OwnPropertyKeys]] trap called'),
    apply: overrides.apply || throwTest262Error('[[Call]] trap called'),
    construct: overrides.construct || throwTest262Error('[[Construct]] trap called')
  };
}
