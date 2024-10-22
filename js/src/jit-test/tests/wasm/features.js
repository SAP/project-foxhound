// Test that if a feature is 'experimental' then we must be in a nightly build,
// and if a feature is 'released' then it must be enabled on release and beta.
//
// An experimental feature is allowed to be disabled by platform/feature flags,
// we only require that it can never be enabled on release/beta builds.
//
// A released feature is allowed to be disabled on nightly. This is useful for
// if we're testing out a new compiler/configuration where a released feature
// is not supported yet. We only require that on release/beta, the feature must
// be enabled.
//
// As features are advanced, this test must be manually updated.
//
// NOTE0: The |jit-test| directive must be updated with all opt-in shell flags
//        for experimental features for this to work correctly.
// NOTE1: This test relies on feature functions accurately guarding use of the
//        feature to work correctly. All features should have a 'disabled.js'
//        test to verify this. Basic testing for this is included with each
//        feature in this test for sanity.
// NOTE2: Keep this file in sync with:
//        `dom/worklet/tests/worklet_audioWorklet_WASM_features.js`.

let release_or_beta = getBuildConfiguration("release_or_beta");
let nightly = !release_or_beta;

let nightlyOnlyFeatures = [
  [
    'relaxed-simd',
    wasmRelaxedSimdEnabled(),
    `(module (func (result v128)
      unreachable
      i16x8.relaxed_laneselect
    ))`
  ],
];

for (let [name, enabled, test] of nightlyOnlyFeatures) {
  if (enabled) {
    assertEq(nightly, true, `${name} must be enabled only on nightly`);
    wasmEvalText(test);
  } else {
    assertErrorMessage(() => wasmEvalText(test), WebAssembly.CompileError, /./);
  }
}

// These are features that are enabled in beta/release but may be disabled at
// run-time for other reasons.  The best we can do for these features is to say
// that if one claims to be supported then it must work, and otherwise there
// must be a CompileError.

let releasedFeaturesMaybeDisabledAnyway = [
  // SIMD will be disabled dynamically on x86/x64 if the hardware isn't SSE4.1+.
  ['simd', wasmSimdEnabled(), `(module (func (result v128) i32.const 0 i8x16.splat))`]
];

for (let [name, enabled, test] of releasedFeaturesMaybeDisabledAnyway) {
  if (release_or_beta) {
    if (enabled) {
      wasmEvalText(test);
    } else {
      assertErrorMessage(() => wasmEvalText(test), WebAssembly.CompileError, /./);
    }
  }
}

let releasedFeatures = [
  ['threads', wasmThreadsEnabled(), `(module (memory 1 1 shared))`],
  [
    'tail-calls',
    wasmTailCallsEnabled(),
    `(module (func) (func (return_call 0)))`
  ],
  ['gc', wasmGcEnabled(), `(module (type (struct)))`],
  [
    'multi-memory',
    wasmMultiMemoryEnabled(),
    `(module (memory 0) (memory 0))`,
  ],
];

for (let [name, enabled, test] of releasedFeatures) {
  if (release_or_beta) {
    assertEq(enabled, true, `${name} must be enabled on release and beta`);
    wasmEvalText(test);
  }
}
