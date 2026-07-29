function foo(n) {
  let src = `o["${n}"] = 42`;
  let setBig = new Function("o", src)
  var rab = new ArrayBuffer(n+1, { maxByteLength: n+1 });
  var ta  = new Int8Array(rab);
  for (var i = 0; i < 100; i++) setBig(Object.create(ta));
  rab.resize(8);
  var victim = Object.create(ta);
  setBig(victim);
  return victim[n];
}

assertEq(foo(1000), undefined)
assertEq(foo(0x100000000), undefined)
