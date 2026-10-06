// The OOM during the construction or any step should clear the references
// between the waiters and tasks, and shouldn't result in UAF.
function f() {
  var x = new Int32Array(new SharedArrayBuffer(4));
  x[0] = 1;
  Atomics.waitAsync(x, 0, 1, 65535);
  oomTest(f);
}
f();
