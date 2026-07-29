onmessage = () => {
  const BIG_BUFFER_SIZE = 1000000;
  const fibStream = new ReadableStream({
    start(controller) {},

    pull(controller) {
      const buffer = new Uint8Array(BIG_BUFFER_SIZE);
      buffer.fill(42);
      controller.enqueue(buffer);
    },
  });

  const r = new Response(fibStream);

  const p = r.blob();
  self.postMessage("reading");

  p.then(() => {
    // really?
  });
};
