// |jit-test| --fast-warmup; --no-threads
let arr = new Uint8Array(2 ** 32);
let out = {x: 42n};
function oobRead(arr, out, idx) {
  let idx1 = (idx + 100) | 0;
  let idx2 = (idx + (2 ** 31 - 1)) | 0;
  let r1 = arr[idx1];
  let r2 = arr[idx2];
  out.x = BigInt(idx2);
  return r2;
}
function test() {
  for (let i = 0; i < 5000; i++) {
    oobRead(arr, out, -50);
  }
  assertEq(oobRead(arr, out, 2 ** 31 - 200), undefined);
}
test();
