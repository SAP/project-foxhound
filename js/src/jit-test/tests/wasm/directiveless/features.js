// |jit-test| include:wasm.js;
// Do not manually change the default features with a jit-test directive. The
// logic below relies on this.

// Test that all features are either:
//   1. 'disabled' - not enabled by the default flags.
//   2. 'nightly' - must be enabled in nightly and not release or beta.
//   3. 'released' - must be enabled in nightly, release, and beta.
//   4. 'released-maybe-disable' - should be enabled, but may not be supported
//      on a platform.
//
// As features are advanced, this test must be manually updated.
//
// NOTE1: This test relies on feature functions accurately guarding use of the
//        feature to work correctly. All features should have a 'disabled.js'
//        test to verify this. Basic testing for this is included with each
//        feature in this test for sanity.
// NOTE2: Keep this file in sync with:
//        `dom/worklet/tests/worklet_audioWorklet_WASM_features.js`.

let supportedFeatures = getWasmSupportedFeatures();
let enabledFeatures = getWasmEnabledFeatures();
let releaseOrBeta = getBuildConfiguration('release_or_beta');
let nightly = !releaseOrBeta;

// All compilers are enabled when we are running with the default flags.
assertEq(wasmCompileMode() == "baseline+ion", true);

// Check if the wasm module text is valid or not.
function check(text) {
  try {
    wasmEvalText(text);
    return true;
  } catch (err) {
    if (!(err instanceof WebAssembly.CompileError)) {
      throw err;
    }
    return false;
  }
}

const DISABLED = "disabled";
const NIGHTLY = "nightly";
const RELEASED_MAYBE_DISABLED = "released-maybe-disabled";
const RELEASED = "released";
const IGNORE = "ignore";

let features = {
  "stackSwitching": {
    status: DISABLED,
    test: () => check(`(tag) (func unreachable resume 0 unreachable)`)
  },
  "customPageSizes": {
    status: DISABLED,
    test: () => check(`(memory 1 1 (pagesize 1))`)
  },
  "compactImports": {
    status: DISABLED,
    test: () => check(`(import "mod" (item "1" (func)) (item "2" (func)))`)
  },
  "memoryControl": {
    status: DISABLED,
    test: () => check(`(func unreachable memory.discard unreachable)`)
  },
  "components": {
    status: DISABLED,
    test: () => WebAssembly.Component !== undefined
  },
  "jsPromiseIntegration": {
    status: RELEASED,
    test: () => WebAssembly.promising !== undefined
  },
  "wideArithmetic": {
    status: NIGHTLY,
    test: () => check(`(func unreachable i64.add128 unreachable)`)
  },
  "simd": {
    status: RELEASED_MAYBE_DISABLED,
    test: () => check(`(func unreachable i8x16.splat unreachable)`)
  },
  "relaxedSimd": {
    status: RELEASED_MAYBE_DISABLED,
    test: () => check(`(func unreachable i16x8.relaxed_laneselect unreachable)`)
  },
  "threads": {
    status: RELEASED,
    test: () => check(`(memory 1 1 shared)`)
  },
  "branchHinting": {
    status: RELEASED,
    // No way to accurately feature test this
    test: () => true,
  },

  // Hard to feature test
  "mozIntGemm": { status: IGNORE, test: () => true },

  // Testing utility
  "testSerialization": { status: IGNORE, test: () => true },
};

// Every key in supportedFeatures must be in features.
for (name in supportedFeatures) {
  assertEq((name in features), true, `expected build config[${name}] in features`);
}

// Every key in enabledFeatures must be in features.
for (name in supportedFeatures) {
  assertEq((name in features), true, `expected build config[${name}] in features`);
}

for (name in features) {
  let {status, test} = features[name];

  // Every key in features must be in supportedFeatures and enabledFeatures.
  assertEq((name in supportedFeatures), true, `expected ${name} in supportedFeatures`);
  assertEq((name in enabledFeatures), true, `expected ${name} in enabledFeatures`);

  // Features can be disabled by build configuration, in which case we can't
  // test anything about them.
  if (!supportedFeatures[name]) {
    continue;
  }

  if (status == IGNORE) {
    continue;
  }

  let checkEnabled = test();
  let reportedEnabled = enabledFeatures[name];
  assertEq(checkEnabled, reportedEnabled, `${name} feature tests disagree`);
  let enabled = checkEnabled;

  if (status == DISABLED) {
    assertEq(enabled, false, `${name} should be disabled`);
  } else if (status == NIGHTLY) {
    assertEq(enabled, nightly, `${name} should be enabled on nightly`);
  } else if (status == RELEASED) {
    assertEq(enabled, true, `${name} should be enabled`);
  } else if (status == RELEASED_MAYBE_DISABLED) {
    // Maybe disabled for runtime specific reasons, at least we successfully
    // ran the feature test.
  } else {
    throw new Error("unknown status");
  }
}
