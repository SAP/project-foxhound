// Small enough maximum byte length to ensure inline contents are used.
const maxByteLength = 32;

const fillValue = 1;
const expected = (fillValue + ",").repeat(maxByteLength).slice(0, -1);

for (let i = 0; i < 100; ++i) {
  let rab = new ArrayBuffer(0, {maxByteLength});
  let u8 = new Uint8Array(rab);

  // Move from inline to malloc contents.
  ensureNonInline(rab);

  // Resize to the maximum byte length.
  rab.resize(maxByteLength);

  // Fill the array with ones.
  u8.fill(fillValue);

  // Trigger GC every tenth iteration.
  if (i % 10 === 0) {
    gc();
  }

  // Compare array contents with the expected value.
  assertEq(u8.toString(), expected);
}
