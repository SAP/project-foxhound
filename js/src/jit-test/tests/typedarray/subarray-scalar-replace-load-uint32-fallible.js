// Fallible unboxed load scalar from Uint32Array.

const u32 = new Uint32Array([
  // First index can be loaded as Int32Value.
  0,

  // Second index can't be loaded as Int32Value.
  -1,
]);

for (let i = 0; i <= 100; ++i) {
  let index = i < 100 ? 0 : 1;
  let r = u32.subarray(index)[0];
  assertEq(r, u32[index]);
}
