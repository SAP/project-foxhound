// |jit-test| module; skip-if: !getBuildConfiguration("source-phase-imports") || !wasmIsSupported() || getBuildConfiguration("release_or_beta"); --enable-source-phase-imports; --enable-wasm-esm-integration; --enable-source-phase-imports-test262-module-source

load(libdir + "asserts.js");

import source mod from "<module source>";

const AbstractModuleSource = getAbstractModuleSource();

assertEq(mod instanceof AbstractModuleSource, true);
