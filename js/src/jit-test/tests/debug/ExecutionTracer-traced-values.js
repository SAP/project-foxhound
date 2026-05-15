if (typeof enableExecutionTracing == "undefined") {
  quit();
}
const VALUE_SUMMARY_VERSION = 2;

const JSVAL_TYPE_DOUBLE = 0x00;
const JSVAL_TYPE_INT32 = 0x01;
const JSVAL_TYPE_BOOLEAN = 0x02;
const JSVAL_TYPE_UNDEFINED = 0x03;
const JSVAL_TYPE_NULL = 0x04;
const JSVAL_TYPE_MAGIC = 0x05;
const JSVAL_TYPE_STRING = 0x06;
const JSVAL_TYPE_SYMBOL = 0x07;
const JSVAL_TYPE_BIGINT = 0x09;
const JSVAL_TYPE_OBJECT = 0x0c;

const GETTER_SETTER_MAGIC = 0x0f;

const GENERIC_OBJECT_HAS_DENSE_ELEMENTS = 1;

const NUMBER_IS_OUT_OF_LINE_MAGIC = 0xf;
const MIN_INLINE_INT = -1;
const MAX_INLINE_INT = 13;

const STRING_ENCODING_LATIN1 = 0;

const OBJECT_KIND_ARRAY_LIKE = 1;
const OBJECT_KIND_MAP_LIKE = 2;
const OBJECT_KIND_FUNCTION = 3;
const OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT = 4;
const OBJECT_KIND_GENERIC_OBJECT = 5;
const OBJECT_KIND_PROXY_OBJECT = 6;

const MAX_COLLECTION_VALUES = 16;

class BufferReader {
  #view;
  #index;

  constructor(buffer, index = 0) {
    this.#view = new DataView(buffer);
    this.#index = index;
  }

  peekUint8() {
    return this.#view.getUint8(this.#index);
  }

  readUint8() {
    let result = this.#view.getUint8(this.#index);
    this.#index += 1;
    return result;
  }

  readUint16() {
    let result = this.#view.getUint16(this.#index, true);
    this.#index += 2;
    return result;
  }

  readUint32() {
    let result = this.#view.getUint32(this.#index, true);
    this.#index += 4;
    return result;
  }

  readInt8() {
    let result = this.#view.getInt8(this.#index);
    this.#index += 1;
    return result;
  }

  readInt16() {
    let result = this.#view.getInt16(this.#index, true);
    this.#index += 2;
    return result;
  }

  readInt32() {
    let result = this.#view.getInt32(this.#index, true);
    this.#index += 4;
    return result;
  }

  readFloat64() {
    let result = this.#view.getFloat64(this.#index, true);
    this.#index += 8;
    return result;
  }

  readString() {
    let encodingAndLength = this.readUint16();
    let length = encodingAndLength & ~(0b11 << 14);
    let encoding = encodingAndLength >> 14;
    if (length == 0) {
      return "";
    }

    // This assertion is just for simplicity in testing. Other values can occur
    // in the wild
    assertEq(encoding, STRING_ENCODING_LATIN1);
    let result = String.fromCharCode(...new Uint8Array(this.#view.buffer.slice(this.#index, this.#index + length)));

    this.#index += length;
    return result;
  }
}

var g = newGlobal({ newCompartment: true });
var h = newGlobal({ newCompartment: true });
g.ccw = h;
h.wrappedObject = {foo: 0};
var dbg = new Debugger();
dbg.addDebuggee(g);

g.enableExecutionTracing();

g.eval(`
var wrappedNumber = new Number(0);
wrappedNumber.foo = 0;

[
  0.1,
  0,
  -2,
  -1,
  13,
  14,
  42,
  false,
  true,
  "bar",
  999999999999999999999999n,
  new Proxy({}, {}),
  [0],
  new Set([0]),
  new Map([[1, 0]]),
  {foo: 42},
  function foo(a,b) {},
  {"1": 0},
  new String("foo"),
  new Boolean(false),
  new Number(0),
  wrappedNumber,
  [{foo: {}}],
  new Set([{foo: {}}]),
  new Map([[{foo: {}}, {bar: {}}]]),
  ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t"],
  {a:0,b:0,c:0,d:0,e:0,f:0,g:0,h:0,i:0,j:0,k:0,l:0,m:0,n:0,o:0,p:0,q:0,r:0,s:0,t:0},
  -0.0,
  null,
  undefined,
  Symbol.for("foo"),
  [,0],
  {[42000]: 0, [Symbol.for("foo")]: 0},
  {shapeTest: 0},
  {shapeTest: 42},
  function foobar(a, {x}, bar = 42) {},
  function foobaz(a, a) {},
  function barbaz(a, ...rest) {},
  ccw.wrappedObject,
  {get testGetter() {return 42}},
].map(function f1(x) { return x; });`);

const trace = g.getExecutionTrace();

g.disableExecutionTracing();

assertEq(trace.length, 1);

let versionReader = new BufferReader(trace[0].valueBuffer, 0);
assertEq(versionReader.readUint32(), VALUE_SUMMARY_VERSION);

function testSingleArgument(event, cb) {
  assertEq(typeof event.values, "number");
  assertEq(event.values < trace[0].valueBuffer.byteLength, true);

  let reader = new BufferReader(trace[0].valueBuffer, event.values);

  // Array.prototype.map's callback is called with 3 args: element, index, array
  assertEq(reader.readUint32(), 3);

  cb(reader);

  // Double check that we see the `index` argument afterwards
  assertEq(reader.readUint8() & 0xf, JSVAL_TYPE_INT32);
}

function inlinedInt32Flags(val) {
  return (val - MIN_INLINE_INT) << 4;
}

const events = trace[0].events.filter(e => e.kind == "FunctionEnter");

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_DOUBLE | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readFloat64(), 0.1);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readInt32(), -2);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(-1));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(13));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readInt32(), 14);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readInt32(), 42);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_BOOLEAN);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_BOOLEAN | 1 << 4);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_STRING);
  assertEq(reader.readString(), "bar");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_BIGINT);
  assertEq(reader.readString(), "999999999999999999999999");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_PROXY_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Proxy");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Array");

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Set");

  assertEq(reader.readUint32(), 1); // size == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_MAP_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Map");

  assertEq(reader.readUint32(), 1); // size == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(1));
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "foo");

  assertEq(reader.readUint32(), 1);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readInt32(), 42);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_FUNCTION);

  assertEq(reader.readString(), "foo");
  assertEq(reader.readUint32(), 2);
  assertEq(reader.readString(), "a");
  assertEq(reader.readString(), "b");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT | (GENERIC_OBJECT_HAS_DENSE_ELEMENTS << 4));
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Object");

  // 0 properties
  assertEq(reader.readUint32(), 0);

  // 2 dense elements (element 0 is a hole)
  assertEq(reader.readUint32(), 2);
  assertEq(reader.readUint8(), JSVAL_TYPE_MAGIC);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT);

  assertEq(reader.readUint8(), JSVAL_TYPE_STRING);
  assertEq(reader.readString(), "foo");

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "String");
  assertEq(shape[1], "length");

  // 1 properties
  assertEq(reader.readUint32(), 1);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(3));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT);

  assertEq(reader.readUint8(), JSVAL_TYPE_BOOLEAN);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Boolean");

  // 0 properties
  assertEq(reader.readUint32(), 0);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT);

  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Number");

  // 0 properties
  assertEq(reader.readUint32(), 0);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_WRAPPED_PRIMITIVE_OBJECT);

  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Number");
  assertEq(shape[1], "foo");

  // 1 property
  assertEq(reader.readUint32(), 1);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape[0], "Array");

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let nestedShape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(nestedShape.length, 2);
  assertEq(nestedShape[0], "Object");
  assertEq(nestedShape[1], "foo");

  // We should have one property, but nothing after that
  assertEq(reader.readUint32(), 1);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape[0], "Set");

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let nestedShape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(nestedShape.length, 2);
  assertEq(nestedShape[0], "Object");
  assertEq(nestedShape[1], "foo");

  // We should have one property, but nothing after that
  assertEq(reader.readUint32(), 1);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_MAP_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape[0], "Map");

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let nestedShape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(nestedShape.length, 2);
  assertEq(nestedShape[0], "Object");
  assertEq(nestedShape[1], "foo");
  assertEq(reader.readUint32(), 1);

  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  nestedShape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(nestedShape.length, 2);
  assertEq(nestedShape[0], "Object");
  assertEq(nestedShape[1], "bar");
  assertEq(reader.readUint32(), 1);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Array");

  assertEq(reader.readUint32(), 20); // length == 20
  for (let i = 0; i < MAX_COLLECTION_VALUES; i++) {
    assertEq(reader.readUint8(), JSVAL_TYPE_STRING);
    assertEq(reader.readString(), String.fromCharCode("a".charCodeAt(0) + i));
  }
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 17);
  assertEq(shape[0], "Object");
  assertEq(shape.numProperties, 20);

  assertEq(reader.readUint32(), 20);
  for (let i = 0; i < MAX_COLLECTION_VALUES; i++) {
    assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
  }
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_DOUBLE | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readFloat64(), -0.0);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_NULL);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_UNDEFINED);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_SYMBOL);
  assertEq(reader.readString(), "foo");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_ARRAY_LIKE);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 1);
  assertEq(shape[0], "Array");

  assertEq(reader.readUint32(), 2); // length == 2
  assertEq(reader.readUint8(), JSVAL_TYPE_MAGIC);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 3);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "Symbol(foo)");
  assertEq(shape[2], "42000");

  assertEq(reader.readUint32(), 2); // length == 2
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

let shapeTestId = -1;
testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "shapeTest");

  // We're going to check in the next test that this ID is shared between
  // same-shaped objects.
  shapeTestId = shape;

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "shapeTest");

  assertEq(shape, shapeTestId);

  assertEq(reader.readUint32(), 1); // length == 1
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | NUMBER_IS_OUT_OF_LINE_MAGIC << 4);
  assertEq(reader.readInt32(), 42);
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_FUNCTION);

  assertEq(reader.readString(), "foobar");
  assertEq(reader.readUint32(), 3);
  assertEq(reader.readString(), "a");
  assertEq(reader.readString(), "");
  assertEq(reader.readString(), "bar");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_FUNCTION);

  assertEq(reader.readString(), "foobaz");
  assertEq(reader.readUint32(), 2);
  assertEq(reader.readString(), "a");
  assertEq(reader.readString(), "a");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_FUNCTION);

  assertEq(reader.readString(), "barbaz");
  assertEq(reader.readUint32(), 2);
  assertEq(reader.readString(), "a");
  assertEq(reader.readString(), "rest");
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "foo");

  assertEq(reader.readUint32(), 1);
  assertEq(reader.readUint8(), JSVAL_TYPE_INT32 | inlinedInt32Flags(0));
});

testSingleArgument(events.shift(), reader => {
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_GENERIC_OBJECT);

  let shape = trace[0].shapeSummaries[reader.readUint32()];
  assertEq(shape.length, 2);
  assertEq(shape[0], "Object");
  assertEq(shape[1], "testGetter");

  assertEq(reader.readUint32(), 1);
  assertEq(reader.readUint8(), GETTER_SETTER_MAGIC);
  assertEq(reader.readUint8(), JSVAL_TYPE_OBJECT);
  assertEq(reader.readUint8(), OBJECT_KIND_FUNCTION);
  assertEq(reader.readString(), "get testGetter");
  assertEq(reader.readUint32(), 0);
  assertEq(reader.readUint8(), JSVAL_TYPE_UNDEFINED);
});

assertEq(events.length, 0);

