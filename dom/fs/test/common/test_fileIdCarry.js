/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that creating more than 256 writable file streams on a single file
// works correctly. This exercises the carry logic in GetNextFreeFileId: each
// createWritable() allocates a new file ID by incrementing a 32-byte buffer
// treated as a large integer. Without proper carry propagation the first byte
// wraps around after 255 increments and collides with earlier IDs.

exported_symbols.manyWritablesTest = async function () {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle("carry_test.txt", { create: true });

  const count = 260;
  const writables = [];
  for (let i = 0; i < count; ++i) {
    const w = await handle.createWritable();
    await w.write("data" + i);
    writables.push(w);
  }

  // Close all writables; without the carry fix some of these would have
  // colliding file IDs and the close/commit would fail or corrupt data.
  for (const w of writables) {
    await w.close();
  }

  // Verify the file is still readable.
  const file = await handle.getFile();
  const text = await file.text();
  Assert.ok(!!text.length, "File should have content after 260 writes");

  await root.removeEntry("carry_test.txt");
};

for (const [key, value] of Object.entries(exported_symbols)) {
  Object.defineProperty(value, "name", {
    value: key,
    writable: false,
  });
}
