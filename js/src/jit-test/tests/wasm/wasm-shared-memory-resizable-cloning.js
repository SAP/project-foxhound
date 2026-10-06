// |jit-test| skip-if: !wasmThreadsEnabled() || !('toResizableBuffer' in WebAssembly.Memory.prototype)

// Structured cloning a shared WebAssembly.Memory must round-trip whether its
// buffer is a fixed-length SharedArrayBuffer or a growable one obtained via
// toResizableBuffer(). This mirrors postMessage of a shared memory to a Worker.

function roundTrip(memory) {
  let clone = serialize(memory, [], {SharedArrayBuffer: 'allow'});
  return deserialize(clone, {SharedArrayBuffer: 'allow'});
}

// Fixed-length backing buffer.
{
  let memory = new WebAssembly.Memory({initial: 1, maximum: 10, shared: true});
  let out = roundTrip(memory);
  assertEq(out instanceof WebAssembly.Memory, true);
  assertEq(out.buffer.byteLength, memory.buffer.byteLength);
}

// Growable backing buffer (toResizableBuffer was called before cloning).
{
  let memory = new WebAssembly.Memory({initial: 1, maximum: 10, shared: true});
  let rb = memory.toResizableBuffer();
  assertEq(rb.growable, true);
  let out = roundTrip(memory);
  assertEq(out instanceof WebAssembly.Memory, true);
  assertEq(out.buffer.byteLength, memory.buffer.byteLength);
}
