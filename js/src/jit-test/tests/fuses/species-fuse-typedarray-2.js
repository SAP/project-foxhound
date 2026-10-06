// Test for typed array species fuse with multiple realms.
function testProto() {
  const TypedArray = Object.getPrototypeOf(Int8Array);

  var g = newGlobal();
  var arr = g.evaluate(`
    var TypedArray = Object.getPrototypeOf(Int8Array);
    new Int8Array(4);
  `);
  var count = 0;
  Object.defineProperty(g.TypedArray.prototype, "constructor", {get: function() {
    count++;
    return Int8Array;
  }});
  delete g.Int8Array.prototype.constructor;
  for (var i = 0; i < 20; i++) {
    assertEq(TypedArray.prototype.slice.call(arr).length, 4);
  }
  assertEq(count, 20);
  assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
  assertEq(g.getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
}
testProto();

var TypedArrays = [
  Int8Array,
  Uint8Array,
  Uint8ClampedArray,
  Int16Array,
  Uint16Array,
  Int32Array,
  Uint32Array,
  BigInt64Array,
  BigUint64Array,
  Float16Array,
  Float32Array,
  Float64Array,
];

function testConcrete(TA) {
  var g = newGlobal();
  var arr = g.evaluate(`new ${TA.name}(4);`);
  var count = 0;
  Object.defineProperty(g[TA.name].prototype, "constructor", {get: function() {
    count++;
    return TA;
  }});
  for (var i = 0; i < 20; i++) {
    assertEq(TA.prototype.slice.call(arr).length, 4);
  }
  assertEq(count, 20);
  assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
  assertEq(g.getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
}
for (var TA of TypedArrays) {
  testConcrete(TA);
}
