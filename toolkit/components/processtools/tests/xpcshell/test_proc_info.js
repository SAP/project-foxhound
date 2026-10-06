"use strict";

// Keep allocations alive across the whole test so GC can't reclaim them.
const KEEP_ALIVE = [];

// Allocate N MiB using ArrayBuffers and *touch* the memory so it's committed.
function allocateTypedMiB(totalMiB = 64, chunkMiB = 8) {
  const chunkSize = chunkMiB * 1024 * 1024;
  const count = Math.ceil(totalMiB / chunkMiB);
  for (let i = 0; i < count; i++) {
    const buf = new ArrayBuffer(chunkSize);
    // Touch one byte per page to ensure RSS growth.
    const view = new Uint8Array(buf);
    for (let j = 0; j < view.length; j += 4096) {
      view[j] = 1;
    }
    KEEP_ALIVE.push(buf);
  }
}

add_task(async function test_currentProcessMemoryUsage() {
  // Simulate memory allocation (strongly reachable + committed)
  Cu.forceGC();
  Cu.forceCC();
  let initialMemory = ChromeUtils.currentProcessMemoryUsage;
  let arr = [];
  for (let i = 0; i < 1_000_000; i++) {
    arr.push({ v: i });
  }

  KEEP_ALIVE.push(arr);
  // Plus a guaranteed 64 MiB of typed-array memory to make growth obvious
  allocateTypedMiB(64, 8);

  let finalMemory = ChromeUtils.currentProcessMemoryUsage;

  info(`Initial memory: ${initialMemory}, final memory: ${finalMemory}`);

  Assert.greater(
    finalMemory,
    initialMemory,
    "Memory usage should increase after allocations"
  );

  Assert.greater(
    finalMemory - initialMemory,
    64 * 1024 * 1024,
    "Memory usage should have growned over 64MiB"
  );
});

async function getCurrentProcessInfo() {
  let info = await ChromeUtils.requestProcInfo();
  // nanoseconds to milliseconds
  return Math.floor(info.cpuTime / 1000000);
}

add_task(async function test_cpuTimeSinceProcessStart() {
  let initialCPUTimeFromRequestProcInfo = await getCurrentProcessInfo();
  let initialCPUTime = ChromeUtils.cpuTimeSinceProcessStart;
  let secondCPUTimeFromRequestProcInfo = await getCurrentProcessInfo();
  Assert.greaterOrEqual(initialCPUTime, initialCPUTimeFromRequestProcInfo);
  Assert.greaterOrEqual(secondCPUTimeFromRequestProcInfo, initialCPUTime);

  // Simulate some CPU load
  let sum = [0];
  for (let i = 0; i < 5_000_000; i++) {
    sum[0] += Math.sqrt(i);
  }
  let finalCPUTimeFromRequestProcInfo = await getCurrentProcessInfo();
  let finalCPUTime = ChromeUtils.cpuTimeSinceProcessStart;
  Assert.greaterOrEqual(finalCPUTime, finalCPUTimeFromRequestProcInfo);

  info(`Initial CPU time: ${initialCPUTime}, final CPU time: ${finalCPUTime}`);

  Assert.greater(
    finalCPUTime,
    initialCPUTime,
    "CPU time should increase after computation"
  );
});
