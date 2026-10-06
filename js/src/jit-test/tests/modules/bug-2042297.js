// |jit-test| module; skip-if: !getBuildConfiguration("source-phase-imports") || !wasmIsSupported() || getBuildConfiguration("release_or_beta"); --enable-source-phase-imports; --enable-wasm-esm-integration

import {s} from "reexport-source-phase-wasm.js";
assertEq(s instanceof WebAssembly.Module, true);
