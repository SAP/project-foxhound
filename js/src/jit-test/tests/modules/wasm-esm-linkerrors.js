// |jit-test| skip-if: !getBuildConfiguration("source-phase-imports") || !wasmIsSupported() || getBuildConfiguration("release_or_beta"); --enable-source-phase-imports; --enable-wasm-esm-integration

load(libdir + "asserts.js");

let error;
import.source("leak.wasm").then(
  () => {
    throw new Error("import.source should have been rejected");
  },
  (e) => {
    error = e;
  }
);

drainJobQueue();

assertEq(error instanceof WebAssembly.LinkError, true);
// Ensure we handled non-null terminated import module names properly
assertEq(error.message.length, 97);
