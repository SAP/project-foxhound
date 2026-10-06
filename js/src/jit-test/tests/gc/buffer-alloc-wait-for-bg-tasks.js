// Exercise waiting for background tasks when the buffer allocator fails to
// allocate a new chunk.
//
// GC zeal makes it so there will frequently be background tasks
// running. Concatenating large arrays causes buffer allocations and
// oomAtAllocation() is used to cause BufferAllocator::allocNewChunk to fail.

// This times out if JITs are disabled.
let options = getJitCompilerOptions();
if (!options['blinterp.enable'] ||
    !options['baseline.enable']) {
  print("Unsupported jit options");
  quit();
}

const loops = 100;
const count = 1000;

gczeal(10, 77);

let a = [];

for (let j = 0; j < loops; j++) {
  for (let i = 0; i < count; i++) {
    a[i] = new Array(1000).fill(i);
  }
  gc();
  for (let i = 0; i < count - 1; i++) {
    oomAtAllocation((j % 5) + 1);
    try {
      a[i] = a[i].concat(a[i + 1]);
      Object();
    } catch (error) {
    } finally {
      resetOOMFailure();
    }
  }
}
