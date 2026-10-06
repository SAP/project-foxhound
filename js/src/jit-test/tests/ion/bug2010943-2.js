// |jit-test| --baseline-warmup-threshold=10; --ion-warmup-threshold=50; --no-threads

function opt() {
  let v0 = 0;
  do {
    var v1 = v0++;
  } while (v0 != 1000);

  const v3 = BigInt.asUintN(64, BigInt(v0));
  try { throw 65536; } catch {}
  return v3;
}

for (var i = 0; i < 20; i++) {
  assertEq(opt(), 1000n);
}
