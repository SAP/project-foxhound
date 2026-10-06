function test() {
  let sab = new SharedArrayBuffer(1, {maxByteLength: 0xffffffff + 0x20});
  const arr = new Uint8Array(sab);
  arr.abc = 1;
  const obj = {
    valueOf() {
      sab.grow(0xffffffff + 0x20)
    }
  };
  arr[0xffffffff + 9] = obj;
  assertEq(sab.byteLength, 0xffffffff + 0x20);
}
for (let i = 0; i < 20; i++) {
  test();
}
