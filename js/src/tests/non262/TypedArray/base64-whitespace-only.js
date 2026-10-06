for (let length of [
  0, 10, 100, 1000,
]) {
  let u8 = Uint8Array.fromBase64(" ".repeat(length));
  assertEq(u8.length, 0);
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
