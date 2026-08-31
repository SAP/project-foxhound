// Test that ReadableStreamDefaultTeeReadRequest::ChunkSteps is traced correctly
// during GC. This validates that microtasks holding onto JS values are properly
// traced when many other microtasks are queued.

function gc() {
  Cu.forceShrinkingGC();
  Cu.forceCC();
  Cu.forceGC();
}

add_task(async function test_tee_trace() {
  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });

  const [branch1] = stream.tee();

  const reader = branch1.getReader();

  const readPromise = reader.read();

  for (let i = 0; i < 10; i++) {
    controller.enqueue(`test data ${i}`);
  }

  await readPromise;
  gc();

  // Clean up
  reader.releaseLock();
  gc();
  await controller.close();
});
