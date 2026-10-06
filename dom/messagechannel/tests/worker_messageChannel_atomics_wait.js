self.onmessage = function (event) {
  const port = event.data.port;

  // Send a message on the transferred port immediately. At this point, the
  // port is in eStateEntangling. Without the fix for bug 2022378, this message
  // would be queued and never sent because
  // Atomics.wait below blocks the thread before the Entangled callback runs.
  port.postMessage({ foo: "bar" });

  // Create shared memory via WebAssembly.Memory to avoid needing COOP/COEP.
  const { buffer } = new WebAssembly.Memory({
    shared: true,
    initial: 1,
    maximum: 1,
  });
  const int32 = new Int32Array(buffer);

  // Block the worker thread, preventing any normal IPC runnables (including
  // the Entangled callback) from being processed.
  Atomics.wait(int32, 0, 0, 30000);
};
