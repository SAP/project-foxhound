// |jit-test| --fuzzing-safe; --ion-check-range-analysis; --disable-main-thread-denormals; --ion-gvn=off;

// This test case should not trigger MAssertRange minus zero assertion on
// Add or Sub.
do {
  const a = 2.2250738585072014e-308;
  -3.337610787760802e-308 + a;

  const b = -2.2250738585072014e-308;
  -3.337610787760802e-308 - b;
} while (!inIon())
