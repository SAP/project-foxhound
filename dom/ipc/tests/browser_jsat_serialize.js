/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* global JSActorTypeUtils */

function equivArrays(src, dst, m) {
  ok(Array.isArray(src), "src array isArray");
  ok(Array.isArray(dst), "dst array isArray");
  ok(dst instanceof Array, "dst array is an instance of Array");
  is(src.length, dst.length, m + ": arrays need same length");
  for (let i = 0; i < src.length; i++) {
    if (Array.isArray(src[i])) {
      equivArrays(src[i], dst[i], m);
    } else {
      is(src[i], dst[i], m + ": element " + i + " should match");
    }
  }
}

add_task(async () => {
  function testPrimitive(v1) {
    let v2 = JSActorTypeUtils.serializeDeserialize(true, v1);
    is(v1, v2, "initial and deserialized values are the same");
  }

  // Undefined.
  testPrimitive(undefined);

  // String.
  testPrimitive("a string");
  testPrimitive("");

  // Null.
  testPrimitive(null);

  // Boolean.
  testPrimitive(true);
  testPrimitive(false);

  // Double.
  testPrimitive(3.14159);
  testPrimitive(-1.1);
  let nan2 = JSActorTypeUtils.serializeDeserialize(true, NaN);
  ok(Number.isNaN(nan2), "NaN deserialization works");
  testPrimitive(Infinity);
  testPrimitive(-Infinity);

  // int32.
  testPrimitive(0);
  testPrimitive(10001);
  testPrimitive(-94892);
  testPrimitive(2147483647);
  testPrimitive(-2147483648);

  // nsIPrincipal
  var sp = Cc["@mozilla.org/systemprincipal;1"].createInstance(Ci.nsIPrincipal);
  testPrimitive(sp);

  // BrowsingContext
  let bc1;
  let TEST_URL = "https://example.org/document-builder.sjs?html=empty-document";
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    bc1 = browser.browsingContext;
    ok(bc1, "found a BC in new tab");
    ok(!bc1.isDiscarded, "BC isn't discarded before we close the tab");
    testPrimitive(bc1);
  });
  ok(bc1.isDiscarded, "BC is discarded after we close the tab");
  is(
    JSActorTypeUtils.serializeDeserialize(true, bc1),
    null,
    "discarded BC should serialize to null"
  );

  // DOMRect.
  let r1 = new DOMRect(1.5, -2.8, 1e10, 0);
  let r2 = JSActorTypeUtils.serializeDeserialize(true, r1);
  ok(DOMRect.isInstance(r2));
  is(r1.x, r2.x, "DOMRect x");
  is(r1.y, r2.y, "DOMRect y");
  is(r1.width, r2.width, "DOMRect width");
  is(r1.height, r2.height, "DOMRect height");

  // Objects.
  let o1 = { a: true, 4: "int", b: 123 };
  let o2 = JSActorTypeUtils.serializeDeserialize(true, o1);
  equivArrays(Object.keys(o1), ["4", "a", "b"], "sorted keys, before");
  equivArrays(Object.keys(o2), ["4", "a", "b"], "sorted keys, after");
  is(o1.a, o2.a, "sorted keys, first property");
  is(o1[4], o2[4], "sorted keys, second property");
  is(o1.b, o2.b, "sorted keys, third property");

  // If an object's property is a getter, then the serialized version will have
  // that property as a plain data property.
  o1 = {
    get a() {
      return 0;
    },
  };
  o2 = JSActorTypeUtils.serializeDeserialize(true, o1);
  equivArrays(Object.keys(o2), ["a"], "getter keys, after");
  is(o1.a, o2.a, "value of getter matches");
  is(
    typeof Object.getOwnPropertyDescriptor(o1, "a").get,
    "function",
    "getter is a function"
  );
  let desc2 = Object.getOwnPropertyDescriptor(o2, "a");
  is(desc2.get, undefined, "getter turned into a plain data property");
  is(desc2.value, o1.a, "new data property has the correct value");

  // Object serialization should preserve the order of properties, because this
  // is visible to JS, and some code depends on it, like the receiver of
  // DevToolsProcessChild:packet messages.
  o1 = { b: "string", a: null };
  o2 = JSActorTypeUtils.serializeDeserialize(true, o1);
  equivArrays(Object.keys(o1), ["b", "a"], "unsorted keys, before");
  equivArrays(Object.keys(o2), ["b", "a"], "unsorted keys, after");
  is(o1.a, o2.a, "unsorted keys, first property");
  is(o1.b, o2.b, "unsorted keys, second property");

  // Array.
  let emptyArray = JSActorTypeUtils.serializeDeserialize(true, []);
  ok(emptyArray instanceof Array, "empty array is an array");
  is(emptyArray.length, 0, "empty array is empty");

  let array1 = [1, "hello", [true, -3.14159], undefined];
  let array2 = JSActorTypeUtils.serializeDeserialize(true, array1);
  equivArrays(array1, array2, "array before and after");

  // Don't preserve weird prototypes for arrays.
  Object.setPrototypeOf(array1, {});
  ok(!(array1 instanceof Array), "array1 has a non-Array prototype");
  array2 = JSActorTypeUtils.serializeDeserialize(true, array1);
  equivArrays(array1, array2, "array before and after");

  // An array with a hole in it gets serialized into an array without any
  // holes, but with undefined at the hole indexes.
  array1 = [1, 2, 3, 4, 5];
  delete array1[1];
  array2 = JSActorTypeUtils.serializeDeserialize(true, array1);
  ok(!(1 in array1), "array1 has a hole at 1");
  ok(1 in array2, "array2 does not have a hole at 1");
  is(array2[1], undefined);
  equivArrays(array1, array2, "array with hole before and after");

  // An array with a non-indexed property will not have it copied over.
  array1 = [1, 2, 3];
  array1.whatever = "whatever";
  array2 = JSActorTypeUtils.serializeDeserialize(true, array1);
  ok("whatever" in array1, "array1 has a non-indexed property");
  ok(!("whatever" in array2), "array2 does not have a non-indexed property");
  equivArrays(
    array1,
    array2,
    "array with non-indexed property before and after"
  );

  // Set.
  let emptySet = JSActorTypeUtils.serializeDeserialize(true, new Set([]));
  ok(emptySet instanceof Set, "empty set is a set");
  is(emptySet.size, 0, "empty set is empty");

  let set1 = new Set([1, "hello", new Set([true])]);
  let set2 = JSActorTypeUtils.serializeDeserialize(true, set1);
  ok(set2 instanceof Set, "set2 is a set");
  is(set2.size, 3, "set2 has correct size");
  ok(set2.has(1), "1 is in the set");
  ok(set2.has("hello"), "string is in the set");
  let setCount = 0;
  for (let e of set2) {
    if (setCount == 0) {
      is(e, 1, "first element is 1");
    } else if (setCount == 1) {
      is(e, "hello", "second element is the right string");
    } else if (setCount == 2) {
      ok(e instanceof Set, "third set element is a set");
      is(e.size, 1, "inner set has correct size");
      ok(e.has(true), "inner set contains true");
    } else {
      ok(false, "too many set elements");
    }
    setCount += 1;
  }
  is(setCount, 3, "found all set elements");

  // Map.
  let emptyMap = JSActorTypeUtils.serializeDeserialize(true, new Map([]));
  ok(emptyMap instanceof Map, "empty map is a map");
  is(emptyMap.size, 0, "empty map is empty");

  let map1 = new Map([
    [2, new Set([true])],
    [1, "hello"],
    ["bye", -11],
  ]);
  let map2 = JSActorTypeUtils.serializeDeserialize(true, map1);
  ok(map2 instanceof Map, "map2 is a map");
  is(map2.size, 3, "map has correct size");
  ok(map2.has(1), "1 is in the map");
  ok(map2.has(2), "2 is in the map");
  ok(map2.has("bye"), "string is in the map");
  let mapCount = 0;
  for (let e of map2) {
    if (mapCount == 0) {
      is(e[0], 2, "first key is 2");
      ok(e[1] instanceof Set, "first value is a set");
      is(e[1].size, 1, "set value has the correct size");
      ok(e[1].has(true), "set value contains true");
    } else if (mapCount == 1) {
      is(e[0], 1, "second key is 1");
      is(e[1], "hello", "second value is the right string");
    } else if (mapCount == 2) {
      is(e[0], "bye", "third key is the right string");
      is(e[1], -11, "third value is the right int");
    } else {
      ok(false, "too many map elements");
    }
    mapCount += 1;
  }
  is(mapCount, 3, "found all map elements");

  // Test that JS values that require the use of JSIPCValue's structured clone
  // fallback are serialized and deserialized properly.
  await SpecialPowers.pushPrefEnv({
    set: [["dom.testing.structuredclonetester.enabled", true]],
  });
  let sct1 = new StructuredCloneTester(true, true);
  let sct2 = JSActorTypeUtils.serializeDeserialize(true, sct1);
  ok(StructuredCloneTester.isInstance(sct2));
  is(sct1.serializable, sct2.serializable, "SC serializable");
  is(sct1.deserializable, sct2.deserializable, "SC serializable");

  // Cyclic data structures can't be serialized.
  let infiniteArray = [];
  infiniteArray[0] = infiniteArray;
  try {
    JSActorTypeUtils.serializeDeserialize(true, infiniteArray);
    ok(false, "serialization should have failed");
  } catch (e) {
    is(e.name, "InternalError", "expected name");
    is(e.message, "too much recursion", "expected message");
  }

  // Serialization doesn't preserve DAGs.
  let someObj = { num: -1 };
  let dag1 = { x: someObj, y: someObj };
  let dag2 = JSActorTypeUtils.serializeDeserialize(true, dag1);
  is(dag1.x, dag1.y, "shared object");
  isnot(dag2.x, dag2.y, "serialization doesn't preserve object DAGs");
  is(dag2.x.num, dag2.y.num, "values are copied");

  array1 = [3];
  let r = JSActorTypeUtils.serializeDeserialize(true, [array1, array1]);
  isnot(r[0], r[1], "serialization doesn't preserve array DAGs");
  equivArrays(r[0], r[1], "DAG array values are copied");
});

add_task(async () => {
  // Test the behavior of attempting to serialize a JS value that has a
  // component that can't be serialized. This will also demonstrate some
  // deliberate incompatibilities with nsFrameMessageManager::GetParamsForMessage().
  // In GetParamsForMessage(), if structured cloning a JS value v fails,
  // it instead attempts to structured clone JSON.parse(JSON.stringify(v)),
  // which can result in some odd behavior.

  function assertThrows(f, expected, desc) {
    let didThrow = false;
    try {
      f();
    } catch (e) {
      didThrow = true;
      let error = e.toString();
      let errorIncluded = error.includes(expected);
      ok(errorIncluded, desc + " exception didn't contain expected string");
      if (!errorIncluded) {
        info(`actual error: ${error}\n`);
      }
    }
    ok(didThrow, desc + " should throw an exception.");
  }

  function assertStrictSerializationFails(v) {
    assertThrows(
      () => JSActorTypeUtils.serializeDeserialize(true, v),
      "structured clone failed for strict serialization",
      "Strict serialization"
    );
  }

  function assertStructuredCloneFails(v) {
    assertThrows(
      () => structuredClone(v),
      "could not be cloned",
      "Structured clone"
    );
  }

  // nsFrameMessageManager::GetParamsForMessage() takes values that can't be
  // structured cloned and turns them into a string via JSON.stringify(), then
  // turns them back into a value via JSON.parse(), then attempts to structured
  // clone that value. This test function emulates that behavior.
  function getParamsForMessage(v) {
    try {
      return structuredClone(v);
    } catch (e) {
      let vString = JSON.stringify(v);
      if (vString == undefined) {
        throw new Error("not valid JSON");
      }
      return structuredClone(JSON.parse(vString));
    }
  }

  function assertGetParamsForMessageThrows(v) {
    assertThrows(
      () => getParamsForMessage(v),
      "not valid JSON",
      "JSON serialize"
    );
  }

  // Functions are neither serializable nor valid JSON.
  let nonSerializable = () => true;

  // A. Top level non-serializable value.
  assertStrictSerializationFails(nonSerializable);
  is(
    JSActorTypeUtils.serializeDeserialize(false, nonSerializable),
    undefined,
    "non-serializable value turns into undefined"
  );
  assertStructuredCloneFails(nonSerializable);
  assertGetParamsForMessageThrows(nonSerializable);

  // B. Arrays.
  // Undefined and NaN are serializable, but not valid JSON.
  // In an array, both are turned into null by JSON.stringify().

  // An array consisting entirely of serializable elements is serialized
  // without any changes by either method, even if it contains undefined
  // and NaN.
  let array1 = [undefined, NaN, -1];
  equivArrays(
    array1,
    JSActorTypeUtils.serializeDeserialize(true, array1),
    "array with non-JSON"
  );
  equivArrays(array1, getParamsForMessage(array1));

  // If we add a new non-serializable element, undefined and Nan become null
  // when serialized via GetParamsForMessage(). The unserializable element
  // becomes undefined with the typed serializer and undefined with
  // GetParamsForMessage().
  let array2 = [undefined, NaN, -1, nonSerializable];
  assertStrictSerializationFails(array2);
  equivArrays(
    [undefined, NaN, -1, undefined],
    JSActorTypeUtils.serializeDeserialize(false, array2),
    "array with both non-JSON and non-serializable"
  );
  equivArrays([null, null, -1, null], getParamsForMessage(array2));

  // C. Objects.
  // An object with only serializable property values is serialized without any
  // changes by either method, even if some property values are undefined or NaN.
  let obj1a = { x: undefined, y: NaN };

  let obj1b = JSActorTypeUtils.serializeDeserialize(true, obj1a);
  equivArrays(
    Object.keys(obj1b),
    ["x", "y"],
    "keys after typed serialization, only serializable"
  );
  is(obj1b.x, undefined, "undefined value preserved");
  ok(Number.isNaN(obj1b.y), "NaN value preserved");

  let obj1c = getParamsForMessage(obj1a);
  equivArrays(
    Object.keys(obj1c),
    ["x", "y"],
    "keys after getParamsForMessage, only serializable"
  );
  is(obj1c.x, undefined, "undefined value preserved");
  ok(Number.isNaN(obj1c.y), "NaN value preserved");

  // Now we add a property with a non-serializable value.
  let obj2a = { x: undefined, y: NaN, z: nonSerializable };

  // With typed serialization, the property with a non-serializable value gets
  // dropped, but everything else is preserved.
  assertStrictSerializationFails(obj2a);
  let obj2b = JSActorTypeUtils.serializeDeserialize(false, obj2a);
  equivArrays(
    Object.keys(obj2b),
    ["x", "y"],
    "keys after typed serialization, with non-serializable"
  );
  is(obj2b.x, undefined, "undefined value preserved");
  ok(Number.isNaN(obj2b.y), "NaN value preserved");

  // With GetParamsForMessage(), the property with a non-serializable value
  // gets dropped. However, due to the behavior of JSON.stringify(), the
  // property with the value undefined is also dropped, while the property
  // with the value NaN is kept, but the value is changed to null.
  let obj2c = getParamsForMessage(obj2a);
  equivArrays(
    Object.keys(obj2c),
    ["y"],
    "keys after getParamsForMessage, with non-serializable"
  );
  is(obj2c.y, null, "NaN property value turned to null");
});
