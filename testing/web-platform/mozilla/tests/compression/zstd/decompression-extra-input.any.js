// META: global=window,worker
// META: script=decompression-correct-input.js

'use strict';

const tests = [
  ["zstd", new Uint8Array([...compressedZstdBytes, 0])],
];

for (const [format, chunk] of tests) {
  promise_test(async t => {
    const ds = new DecompressionStream(format);
    const reader = ds.readable.getReader();
    const writer = ds.writable.getWriter();
    writer.write(chunk).catch(() => { });
    const { done, value } = await reader.read();
    assert_array_equals(Array.from(value), trueChunkValue, "value should match");
    await promise_rejects_js(t, TypeError, reader.read(), "Extra input should eventually throw");
  }, `decompressing ${format} input with extra pad should still give the output`);
}
