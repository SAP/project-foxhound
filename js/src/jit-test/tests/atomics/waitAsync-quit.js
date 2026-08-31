// This shouldn't hit any assertion failure during the shutdown.

let c = new SharedArrayBuffer(16);
let d = new Int32Array(c);

for (var i = 0; i < 200; i++) {
  Atomics.waitAsync(d, 0, 0, 1);
}

// Any remainig delayed tasks for the timeout should be ignored.
quit();
