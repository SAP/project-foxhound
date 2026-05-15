function test() {
  var lengths = [10, 10_000, 20_000, 50_000, 71_231, 71_232, 128_001];
  // Use a loop to ensure we get typed arrays allocated from JIT code with a
  // lazy ArrayBuffer.
  for (var i = 0; i < 20; i++) {
    for (var len of lengths) {
      var arr = new Uint8Array(len);
      if (i >= 15) {
        minorgc();
      }
      arr[len - 1] = 0xf7;
      var buf = arr.buffer;
      assertEq(arr.byteLength, len);
      assertEq(buf.byteLength, len);
      assertEq(arr[len - 1], 0xf7);

      arr = new Uint16Array(len);
      if (i >= 15) {
        minorgc();
      }
      arr[len - 1] = 0x1234;
      buf = arr.buffer;
      assertEq(arr.byteLength, len * 2);
      assertEq(buf.byteLength, len * 2);
      assertEq(arr[len - 1], 0x1234);

      arr = new BigInt64Array(len);
      if (i >= 15) {
        minorgc();
      }
      arr[len - 1] = 12345n;
      buf = arr.buffer;
      assertEq(arr.byteLength, len * 8);
      assertEq(buf.byteLength, len * 8);
      assertEq(arr[len - 1], 12345n);
    }
  }
}
test();
