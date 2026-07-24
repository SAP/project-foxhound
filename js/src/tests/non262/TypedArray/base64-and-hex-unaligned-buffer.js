function toBase64(Buffer) {
  for (var length = 1; length <= 32; ++length) {
    var buffer = new Buffer(length);
    for (var offset = 0; offset < length; ++offset) {
      var u8 = new Uint8Array(buffer, offset);
      assertEq(u8.length > 0, true);

      var str = u8.toBase64();
      assertEq(str.startsWith("A"), true);
      assertEq(str.endsWith("A") || str.endsWith("="), true);
    }
  }
}
toBase64(ArrayBuffer);
if (typeof SharedArrayBuffer === "function")
  toBase64(SharedArrayBuffer);

function toHex(Buffer) {
  for (var length = 1; length <= 32; ++length) {
    var buffer = new Buffer(length);
    for (var offset = 0; offset < length; ++offset) {
      var u8 = new Uint8Array(buffer, offset);
      assertEq(u8.length > 0, true);

      var str = u8.toHex();
      assertEq(str.startsWith("00"), true);
      assertEq(str.endsWith("00"), true);
    }
  }
}
toHex(ArrayBuffer);
if (typeof SharedArrayBuffer === "function")
  toHex(SharedArrayBuffer);

function setFromHex(Buffer) {
  var input = "aabbccddeeff00112233445566778899";

  for (var length = 1; length <= 32; ++length) {
    var buffer = new Buffer(length);
    for (var offset = 0; offset < length; ++offset) {
      var u8 = new Uint8Array(buffer, offset);
      assertEq(u8.length > 0, true);

      for (var str = input; str.length; str = str.slice(0, -2)) {
        u8.setFromHex(str);
        assertEq(u8[0], 0xaa);
      }
    }
  }
}
setFromHex(ArrayBuffer);
if (typeof SharedArrayBuffer === "function")
  setFromHex(SharedArrayBuffer);

function setFromBase64(Buffer) {
  var input = "AAA".repeat(16);

  for (var length = 1; length <= 32; ++length) {
    var buffer = new Buffer(length);
    for (var offset = 0; offset < length; ++offset) {
      var u8 = new Uint8Array(buffer, offset);
      assertEq(u8.length > 0, true);

      for (var str = input; str.length; str = str.slice(0, -4)) {
        u8.setFromBase64(str);
        assertEq(u8[0], 0);

        u8.setFromBase64(str.slice(0, -1) + "=");
        assertEq(u8[0], 0);

        u8.setFromBase64(str.slice(0, -2) + "==");
        assertEq(u8[0], 0);

        u8.setFromBase64(str.slice(0, -3), {lastChunkHandling: "stop-before-partial"});
        assertEq(u8[0], 0);
      }
    }
  }
}
setFromBase64(ArrayBuffer);
if (typeof SharedArrayBuffer === "function")
  setFromBase64(SharedArrayBuffer);

if (typeof reportCompare === "function")
  reportCompare(true, true);
