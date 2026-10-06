// Same as inlinable-native-accessor-7.js, but now without forcing Ion ICs.

// Ignore unhandled rejections when calling Promise and AsyncFunction methods.
ignoreUnhandledRejections();

// Function cloned for each test.
function test(v) {
  for (var i = 0; i < 100; ++i) {
    // |v.key| is a getter calling a built-in method or accessor.
    v.key;
  }
}

// Add |fn| as a method on |holder| and then call it using |thisValue| as the this-value.
function runTest(holder, thisValue, key, fn) {
  assertEq(typeof fn, "function");
  assertEq(
    holder === thisValue || Object.prototype.isPrototypeOf.call(holder, Object(thisValue)),
    true,
    `${String(key)} can be found on thisValue when stored in holder`
  );

  // Add a prefix so we don't overwrite built-in methods.
  var safeKey = "__" + String(key);

  Object.defineProperty(holder, safeKey, {
    get: fn,
    configurable: true,
  });

  try {
    var t = Function(`return ${test.toString().replaceAll("key", safeKey)}`)();
    t(thisValue);
  } catch {
    // Intentionally ignore any errors.
  }

  // Also test wrappers of primitive values.
  if (Object(thisValue) !== thisValue) {
    try {
      var t = Function(`return ${test.toString().replaceAll("key", safeKey)}`)();
      t(Object(thisValue));
    } catch {
      // Intentionally ignore any errors.
    }
  }
}

// Test all methods and accessors of |object|.
function testForEach(object, holder, thisValue) {
  for (var key of Reflect.ownKeys(object)) {
    var desc = Reflect.getOwnPropertyDescriptor(object, key);
    if (typeof desc.value === "function")
      runTest(holder, thisValue, key, desc.value);
    if (typeof desc.get === "function")
      runTest(holder, thisValue, key, desc.get);
    if (typeof desc.set === "function")
      runTest(holder, thisValue, key, desc.set);
  }
}

var seenProto = new Set();

// Test along the prototype chain of |objectOrPrimitive|.
function testProto(objectOrPrimitive) {
  var proto = Object.getPrototypeOf(objectOrPrimitive);

  while (proto) {
    // Install methods on |proto| and then call wih |obj| as the this-value.
    testForEach(proto, proto, objectOrPrimitive);

    // Cover all objects on the prototype chain.
    proto = Reflect.getPrototypeOf(proto);

    // But skip already seen prototypes to ensure we don't spend too much time on this test.
    if (seenProto.has(proto)) {
      break;
    }
    seenProto.add(proto);
  }
}

// Test constructor of |objectOrPrimitive|.
function testConstructor(objectOrPrimitive) {
  // Install constructor methods on the prototype object and then call with |objectOrPrimitive|
  // as the this-value.
  testForEach(obj.constructor, Object.getPrototypeOf(objectOrPrimitive), objectOrPrimitive);
}

function testSingleton(singleton) {
  var thisValue = {};
  testForEach(singleton, thisValue, thisValue);
}

for (var obj of [
  // Fundamental Objects <https://tc39.es/ecma262/#sec-fundamental-objects>.
  {},
  Function(),
  false,
  Symbol(),
  new Error(),

  // Numbers and Dates <https://tc39.es/ecma262/#sec-numbers-and-dates>
  0,
  0n,
  new Date(0),

  // Text Processing <https://tc39.es/ecma262/#sec-text-processing>
  "",
  /(?:)/,

  // Indexed Collections <https://tc39.es/ecma262/#sec-indexed-collections>
  [],
  new Int32Array(1),
  new Uint8Array(1),

  // Keyed Collections <https://tc39.es/ecma262/#sec-keyed-collections>
  new Map(),
  new Set(),
  new WeakMap(),
  new WeakSet(),
  
  // Structured Data <https://tc39.es/ecma262/#sec-structured-data>
  new ArrayBuffer(1),
  new SharedArrayBuffer(1),
  new DataView(new ArrayBuffer(8)),

  // Managing Memory <https://tc39.es/ecma262/#sec-managing-memory>
  new WeakRef({}),
  new FinalizationRegistry(() => {}),

  // Control Abstraction Objects <https://tc39.es/ecma262/#sec-control-abstraction-objects>
  new class extends Iterator{},
  new Promise(() => {}),
  (function*(){}).constructor,
  (async function*(){}).constructor,
  (async function(){}).constructor,
]) {
  testProto(obj);
  testConstructor(obj);
}

testSingleton(Math);
testSingleton(Atomics);
testSingleton(JSON);
testSingleton(Reflect);
