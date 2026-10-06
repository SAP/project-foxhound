function test() {
  let ab = new ArrayBuffer(1, {maxByteLength: 0xffffffff + 0x20});
  const arr = new Uint8Array(ab);
  const obj = {
    valueOf() {
      ab.resize(0xffffffff + 0x20)
    }
  };
  arr[0xffffffff + 9] = obj;
  assertEq(ab.byteLength, 0xffffffff + 0x20);
}
for (let i = 0; i < 20; i++) {
  test();
}
