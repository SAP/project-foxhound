for (let string of [
  // No trailing padding
  "ab",
  "abc",

  // With trailing padding
  "ab==",
  "abc=",

  // Full chunk
  "abcd",
]) {
  for (let i = 0; i <= 4; ++i) {
    let str = "abcd".repeat(i) + string;

    let expected = Uint8Array.fromBase64(str);

    for (let j = 1; j < 8; ++j) {
      let space = " ".repeat(j);

      // Leading whitespace
      assertEqArray(Uint8Array.fromBase64(space + str), expected);

      // Trailing whitespace
      assertEqArray(Uint8Array.fromBase64(str + space), expected);

      // Interspersed whitespace
      assertEqArray(Uint8Array.fromBase64(str.split("").join(space)), expected);
    }
  }
}

// Invalid trailing chunk
for (let string of [
  "a",
  "a=",
  "a==",
  "a===",
]) {
  for (let i = 0; i <= 4; ++i) {
    let str = "abcd".repeat(i) + string;

    assertThrowsInstanceOf(() => Uint8Array.fromBase64(str), SyntaxError);

    for (let j = 1; j < 8; ++j) {
      let space = " ".repeat(j);

      // Leading whitespace
      assertThrowsInstanceOf(() => Uint8Array.fromBase64(space + str), SyntaxError);

      // Trailing whitespace
      assertThrowsInstanceOf(() => Uint8Array.fromBase64(str + space), SyntaxError);

      // Interspersed whitespace
      assertThrowsInstanceOf(() => Uint8Array.fromBase64(str.split("").join(space)), SyntaxError);
    }
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
