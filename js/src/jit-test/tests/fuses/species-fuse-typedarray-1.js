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

function test() {
  // Mutating %TypedArray%.prototype.constructor pops the fuse. A no-op change is fine.
  newGlobal().evaluate(`
    assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
    const TypedArray = Object.getPrototypeOf(Int8Array);
    let p = TypedArray.prototype.constructor;
    TypedArray.prototype.constructor = p;
    assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
    TypedArray.prototype.constructor = Object;
    assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
  `);

  // Mutating %TypedArray%[Symbol.species] pops the fuse.
  newGlobal().evaluate(`
    assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
    const TypedArray = Object.getPrototypeOf(Int8Array);
    delete TypedArray[Symbol.species];
    assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
  `);

  // Mutating <TypedArray>.prototype.constructor pops the fuse. A no-op change is fine.
  for (var TA of TypedArrays) {
    newGlobal().evaluate(`
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
      let p = ${TA.name}.prototype.constructor;
      ${TA.name}.prototype.constructor = p;
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
      ${TA.name}.prototype.constructor = Object;
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
    `);
  }

  // Mutating the prototype of <TypedArray>.prototype pops the fuse. A no-op change is fine.
  for (var TA of TypedArrays) {
    newGlobal().evaluate(`
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
      let p = Object.getPrototypeOf(${TA.name}.prototype);
      Object.setPrototypeOf(${TA.name}.prototype, p);
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, true);
      Object.setPrototypeOf(${TA.name}.prototype, Object);
      assertEq(getFuseState().OptimizeTypedArraySpeciesFuse.intact, false);
    `);
  }
}
test();
