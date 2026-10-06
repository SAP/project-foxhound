// |jit-test| --strict-benchmark-mode; --disable-wasm-huge-memory; exitstatus: 1; skip-if: !getBuildConfiguration('benchmark-suitable') || !wasmHugeMemorySupported()
// --strict-benchmark-mode should refuse when wasm huge memory is disabled.
