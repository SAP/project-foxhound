for (var i = 0; i < 1000; i++) {
  function a() { a; }
  for (let b = 0; b < 5; b++) {
    new SharedArrayBuffer();
    a(BigInt.asUintN(64, BigInt(b)));
  }
}
