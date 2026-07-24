// META: global=window,worker
// META: script=decompression-correct-input.js

"use strict";

promise_test(async t => {
  const ds = new DecompressionStream("zstd");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  const writePromise = writer.write(compressedZstdBytes);
  const writerClosePromise = writer.close();

  const { value, done } = await reader.read();

  assert_false(
    done,
    "The done flag should not be set after reading valid input"
  );

  await writePromise;
  await writerClosePromise;

  assert_array_equals(Array.from(value), trueChunkValue, "value should match");
}, "decompressing valid zstd input should yield 'expected output'");
