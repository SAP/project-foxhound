// |jit-test| --strict-benchmark-mode; --setpref=wasm_lazy_tiering_synchronous=true; exitstatus: 1; skip-if: !getBuildConfiguration('benchmark-suitable')
// --strict-benchmark-mode should refuse when wasm synchronous lazy tiering is enabled.
