function mutateProto(i) {
  with ({});
  if (i === 100) {
    Object.setPrototypeOf(Int8Array.prototype, Object.prototype);
  }
}

function test(i) {
  var x = new Int8Array(0).subarray();
  mutateProto(i);
  return x.length;
}

for (var i = 0; i <= 100; ++i) {
  assertEq(test(i), i < 100 ? 0 : undefined);
}
