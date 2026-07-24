// GENERATED, DO NOT EDIT
// file: iteratorZipUtils.js
// Copyright (C) 2025 André Bargull.  All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: |
    Utility functions for testing Iterator.prototype.zip and Iterator.prototype.zipKeyed. Requires inclusion of propertyHelper.js.
defines:
  - forEachSequenceCombination
  - forEachSequenceCombinationKeyed
  - assertZipped
  - assertZippedKeyed
  - assertIteratorResult
  - assertIsPackedArray
---*/

// Assert |result| is an object created by CreateIteratorResultObject.
function assertIteratorResult(result, value, done, label) {
  assert.sameValue(
    Object.getPrototypeOf(result),
    Object.prototype,
    label + ": [[Prototype]] of iterator result is Object.prototype"
  );

  assert(Object.isExtensible(result), label + ": iterator result is extensible");

  var ownKeys = Reflect.ownKeys(result);
  assert.compareArray(ownKeys, ["value", "done"], label + ": iterator result properties");

  verifyProperty(result, "value", {
    value: value,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  verifyProperty(result, "done", {
    value: done,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

// Assert |array| is a packed array with default property attributes.
function assertIsPackedArray(array, label) {
  assert(Array.isArray(array), label + ": array is an array exotic object");

  assert.sameValue(
    Object.getPrototypeOf(array),
    Array.prototype,
    label + ": [[Prototype]] of array is Array.prototype"
  );

  assert(Object.isExtensible(array), label + ": array is extensible");

  // Ensure "length" property has its default property attributes.
  verifyProperty(array, "length", {
    writable: true,
    enumerable: false,
    configurable: false,
  });

  // Ensure no holes and all elements have the default property attributes.
  for (var i = 0; i < array.length; i++) {
    verifyProperty(array, i, {
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
}

// Assert |array| is an extensible null-prototype object with default property attributes.
function _assertIsNullProtoMutableObject(object, label) {
  assert.sameValue(
    Object.getPrototypeOf(object),
    null,
    label + ": [[Prototype]] of object is null"
  );

  assert(Object.isExtensible(object), label + ": object is extensible");

  // Ensure all properties have the default property attributes.
  var keys = Object.getOwnPropertyNames(object);
  for (var i = 0; i < keys.length; i++) {
    verifyProperty(object, keys[i], {
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
}

// Assert that the `zipped` iterator yields the first `count` outputs of Iterator.zip.
// Assumes `inputs` is an array of arrays, each with length >= `count`.
// Advances `zipped` by `count` steps.
function assertZipped(zipped, inputs, count, label) {
  // Last returned elements array.
  var last = null;

  for (var i = 0; i < count; i++) {
    var itemLabel = label + ", step " + i;

    var result = zipped.next();
    var value = result.value;

    // Test IteratorResult structure.
    assertIteratorResult(result, value, false, itemLabel);

    // Ensure value is a new array.
    assert.notSameValue(value, last, itemLabel + ": returns a new array");
    last = value;

    // Ensure all array elements have the expected value.
    var expected = inputs.map(function (array) {
      return array[i];
    });
    assert.compareArray(value, expected, itemLabel + ": values");

    // Ensure value is a packed array with default data properties.
    assertIsPackedArray(value, itemLabel);
  }
}

// Assert that the `zipped` iterator yields the first `count` outputs of Iterator.zipKeyed.
// Assumes `inputs` is an object whose values are arrays, each with length >= `count`.
// Advances `zipped` by `count` steps.
function assertZippedKeyed(zipped, inputs, count, label) {
  // Last returned elements array.
  var last = null;

  var expectedKeys = Object.keys(inputs);

  for (var i = 0; i < count; i++) {
    var itemLabel = label + ", step " + i;

    var result = zipped.next();
    var value = result.value;

    // Test IteratorResult structure.
    assertIteratorResult(result, value, false, itemLabel);

    // Ensure resulting object is a new object.
    assert.notSameValue(value, last, itemLabel + ": returns a new object");
    last = value;

    // Ensure resulting object has the expected keys and values.
    assert.compareArray(Reflect.ownKeys(value), expectedKeys, itemLabel + ": result object keys");

    var expectedValues = Object.values(inputs).map(function (array) {
      return array[i];
    });
    assert.compareArray(Object.values(value), expectedValues, itemLabel + ": result object values");

    // Ensure resulting object is a null-prototype mutable object with default data properties.
    _assertIsNullProtoMutableObject(value, itemLabel);
  }
}

function forEachSequenceCombinationKeyed(callback) {
  return forEachSequenceCombination(function(inputs, inputsLabel, min, max) {
    var object = {};
    for (var i = 0; i < inputs.length; ++i) {
      object["prop_" + i] = inputs[i];
    }
    inputsLabel = "inputs = " + JSON.stringify(object);
    callback(object, inputsLabel, min, max);
  });
}

function forEachSequenceCombination(callback) {
  function test(inputs) {
    if (inputs.length === 0) {
      callback(inputs, "inputs = []", 0, 0);
      return;
    }

    var lengths = inputs.map(function(array) {
      return array.length;
    });

    var min = Math.min.apply(null, lengths);
    var max = Math.max.apply(null, lengths);

    var inputsLabel = "inputs = " + JSON.stringify(inputs);

    callback(inputs, inputsLabel, min, max);
  }

  // Yield all prefixes of the string |s|.
  function* prefixes(s) {
    for (var i = 0; i <= s.length; ++i) {
      yield s.slice(0, i);
    }
  }

  // Zip an empty iterable.
  test([]);

  // Zip a single iterator.
  for (var prefix of prefixes("abcd")) {
    test([prefix.split("")]);
  }

  // Zip two iterators.
  for (var prefix1 of prefixes("abcd")) {
    for (var prefix2 of prefixes("efgh")) {
      test([prefix1.split(""), prefix2.split("")]);
    }
  }

  // Zip three iterators.
  for (var prefix1 of prefixes("abcd")) {
    for (var prefix2 of prefixes("efgh")) {
      for (var prefix3 of prefixes("ijkl")) {
        test([prefix1.split(""), prefix2.split(""), prefix3.split("")]);
      }
    }
  }
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

function allowProxyTraps(overrides) {
  function throwTest262Error(msg) {
    return function () { throw new Test262Error(msg); };
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

// file: wellKnownIntrinsicObjects.js
// Copyright (C) 2018 the V8 project authors. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.
/*---
description: |
    An Array of all representable Well-Known Intrinsic Objects
defines: [WellKnownIntrinsicObjects, getWellKnownIntrinsicObject]
---*/

const WellKnownIntrinsicObjects = [
  {
    name: '%AggregateError%',
    source: 'AggregateError',
  },
  {
    name: '%Array%',
    source: 'Array',
  },
  {
    name: '%ArrayBuffer%',
    source: 'ArrayBuffer',
  },
  {
    name: '%ArrayIteratorPrototype%',
    source: 'Object.getPrototypeOf([][Symbol.iterator]())',
  },
  {
    // Not currently accessible to ECMAScript user code
    name: '%AsyncFromSyncIteratorPrototype%',
    source: '',
  },
  {
    name: '%AsyncFunction%',
    source: '(async function() {}).constructor',
  },
  {
    name: '%AsyncGeneratorFunction%',
    source: '(async function* () {}).constructor',
  },
  {
    name: '%AsyncGeneratorPrototype%',
    source: 'Object.getPrototypeOf(async function* () {}).prototype',
  },
  {
    name: '%AsyncIteratorPrototype%',
    source: 'Object.getPrototypeOf(Object.getPrototypeOf(async function* () {}).prototype)',
  },
  {
    name: '%Atomics%',
    source: 'Atomics',
  },
  {
    name: '%BigInt%',
    source: 'BigInt',
  },
  {
    name: '%BigInt64Array%',
    source: 'BigInt64Array',
  },
  {
    name: '%BigUint64Array%',
    source: 'BigUint64Array',
  },
  {
    name: '%Boolean%',
    source: 'Boolean',
  },
  {
    name: '%DataView%',
    source: 'DataView',
  },
  {
    name: '%Date%',
    source: 'Date',
  },
  {
    name: '%decodeURI%',
    source: 'decodeURI',
  },
  {
    name: '%decodeURIComponent%',
    source: 'decodeURIComponent',
  },
  {
    name: '%encodeURI%',
    source: 'encodeURI',
  },
  {
    name: '%encodeURIComponent%',
    source: 'encodeURIComponent',
  },
  {
    name: '%Error%',
    source: 'Error',
  },
  {
    name: '%eval%',
    source: 'eval',
  },
  {
    name: '%EvalError%',
    source: 'EvalError',
  },
  {
    name: '%FinalizationRegistry%',
    source: 'FinalizationRegistry',
  },
  {
    name: '%Float32Array%',
    source: 'Float32Array',
  },
  {
    name: '%Float64Array%',
    source: 'Float64Array',
  },
  {
    // Not currently accessible to ECMAScript user code
    name: '%ForInIteratorPrototype%',
    source: '',
  },
  {
    name: '%Function%',
    source: 'Function',
  },
  {
    name: '%GeneratorFunction%',
    source: '(function* () {}).constructor',
  },
  {
    name: '%GeneratorPrototype%',
    source: 'Object.getPrototypeOf(function * () {}).prototype',
  },
  {
    name: '%Int8Array%',
    source: 'Int8Array',
  },
  {
    name: '%Int16Array%',
    source: 'Int16Array',
  },
  {
    name: '%Int32Array%',
    source: 'Int32Array',
  },
  {
    name: '%isFinite%',
    source: 'isFinite',
  },
  {
    name: '%isNaN%',
    source: 'isNaN',
  },
  {
    name: '%Iterator%',
    source: 'typeof Iterator !== "undefined" ? Iterator : Object.getPrototypeOf(Object.getPrototypeOf([][Symbol.iterator]())).constructor',
  },
  {
    name: '%IteratorHelperPrototype%',
    source: 'Object.getPrototypeOf(Iterator.from([]).drop(0))',
  },
  {
    name: '%JSON%',
    source: 'JSON',
  },
  {
    name: '%Map%',
    source: 'Map',
  },
  {
    name: '%MapIteratorPrototype%',
    source: 'Object.getPrototypeOf(new Map()[Symbol.iterator]())',
  },
  {
    name: '%Math%',
    source: 'Math',
  },
  {
    name: '%Number%',
    source: 'Number',
  },
  {
    name: '%Object%',
    source: 'Object',
  },
  {
    name: '%parseFloat%',
    source: 'parseFloat',
  },
  {
    name: '%parseInt%',
    source: 'parseInt',
  },
  {
    name: '%Promise%',
    source: 'Promise',
  },
  {
    name: '%Proxy%',
    source: 'Proxy',
  },
  {
    name: '%RangeError%',
    source: 'RangeError',
  },
  {
    name: '%ReferenceError%',
    source: 'ReferenceError',
  },
  {
    name: '%Reflect%',
    source: 'Reflect',
  },
  {
    name: '%RegExp%',
    source: 'RegExp',
  },
  {
    name: '%RegExpStringIteratorPrototype%',
    source: 'Object.getPrototypeOf(RegExp.prototype[Symbol.matchAll](""))',
  },
  {
    name: '%Set%',
    source: 'Set',
  },
  {
    name: '%SetIteratorPrototype%',
    source: 'Object.getPrototypeOf(new Set()[Symbol.iterator]())',
  },
  {
    name: '%SharedArrayBuffer%',
    source: 'SharedArrayBuffer',
  },
  {
    name: '%String%',
    source: 'String',
  },
  {
    name: '%StringIteratorPrototype%',
    source: 'Object.getPrototypeOf(new String()[Symbol.iterator]())',
  },
  {
    name: '%Symbol%',
    source: 'Symbol',
  },
  {
    name: '%SyntaxError%',
    source: 'SyntaxError',
  },
  {
    name: '%ThrowTypeError%',
    source: '(function() { "use strict"; return Object.getOwnPropertyDescriptor(arguments, "callee").get })()',
  },
  {
    name: '%TypedArray%',
    source: 'Object.getPrototypeOf(Uint8Array)',
  },
  {
    name: '%TypeError%',
    source: 'TypeError',
  },
  {
    name: '%Uint8Array%',
    source: 'Uint8Array',
  },
  {
    name: '%Uint8ClampedArray%',
    source: 'Uint8ClampedArray',
  },
  {
    name: '%Uint16Array%',
    source: 'Uint16Array',
  },
  {
    name: '%Uint32Array%',
    source: 'Uint32Array',
  },
  {
    name: '%URIError%',
    source: 'URIError',
  },
  {
    name: '%WeakMap%',
    source: 'WeakMap',
  },
  {
    name: '%WeakRef%',
    source: 'WeakRef',
  },
  {
    name: '%WeakSet%',
    source: 'WeakSet',
  },
  {
    name: '%WrapForValidIteratorPrototype%',
    source: 'Object.getPrototypeOf(Iterator.from({ [Symbol.iterator](){ return {}; } }))',
  },

  // Extensions to well-known intrinsic objects.
  //
  // https://tc39.es/ecma262/#sec-additional-properties-of-the-global-object
  {
    name: "%escape%",
    source: "escape",
  },
  {
    name: "%unescape%",
    source: "unescape",
  },

  // Extensions to well-known intrinsic objects.
  //
  // https://tc39.es/ecma402/#sec-402-well-known-intrinsic-objects
  {
    name: "%Intl%",
    source: "Intl",
  },
  {
    name: "%Intl.Collator%",
    source: "Intl.Collator",
  },
  {
    name: "%Intl.DateTimeFormat%",
    source: "Intl.DateTimeFormat",
  },
  {
    name: "%Intl.DisplayNames%",
    source: "Intl.DisplayNames",
  },
  {
    name: "%Intl.DurationFormat%",
    source: "Intl.DurationFormat",
  },
  {
    name: "%Intl.ListFormat%",
    source: "Intl.ListFormat",
  },
  {
    name: "%Intl.Locale%",
    source: "Intl.Locale",
  },
  {
    name: "%Intl.NumberFormat%",
    source: "Intl.NumberFormat",
  },
  {
    name: "%Intl.PluralRules%",
    source: "Intl.PluralRules",
  },
  {
    name: "%Intl.RelativeTimeFormat%",
    source: "Intl.RelativeTimeFormat",
  },
  {
    name: "%Intl.Segmenter%",
    source: "Intl.Segmenter",
  },
  {
    name: "%IntlSegmentIteratorPrototype%",
    source: "Object.getPrototypeOf(new Intl.Segmenter().segment()[Symbol.iterator]())",
  },
  {
    name: "%IntlSegmentsPrototype%",
    source: "Object.getPrototypeOf(new Intl.Segmenter().segment())",
  },

  // Extensions to well-known intrinsic objects.
  //
  // https://tc39.es/proposal-temporal/#sec-well-known-intrinsic-objects
  {
    name: "%Temporal%",
    source: "Temporal",
  },
];

WellKnownIntrinsicObjects.forEach((wkio) => {
  var actual;

  try {
    actual = new Function("return " + wkio.source)();
  } catch (exception) {
    // Nothing to do here.
  }

  wkio.value = actual;
});

/**
 * Returns a well-known intrinsic object, if the implementation provides it.
 * Otherwise, throws.
 * @param {string} key - the specification's name for the intrinsic, for example
 *   "%Array%"
 * @returns {object} the well-known intrinsic object.
 */
function getWellKnownIntrinsicObject(key) {
  for (var ix = 0; ix < WellKnownIntrinsicObjects.length; ix++) {
    if (WellKnownIntrinsicObjects[ix].name === key) {
      var value = WellKnownIntrinsicObjects[ix].value;
      if (value !== undefined)
        return value;
      throw new Test262Error('this implementation could not obtain ' + key);
    }
  }
  throw new Test262Error('unknown well-known intrinsic ' + key);
}
