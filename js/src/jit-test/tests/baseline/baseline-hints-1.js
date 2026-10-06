// |jit-test| --blinterp-warmup-threshold=1; --baseline-warmup-threshold=1
// Simple test to make sure an eager baseline hint is set after entering baseline.

if (typeof getJitCompilerOptions == "function" && 
    typeof inJit == "function" && 
    typeof hasBaselineHint == "function") {

  var jco = getJitCompilerOptions();
  if (jco["baseline.enable"] && jco["blinterp.enable"] &&
    jco["blinterp.warmup.trigger"] == 1 &&
    jco["baseline.warmup.trigger"] == 1) {

    function testFunction() {
      return inJit();
    }

    assertEq(hasBaselineHint(testFunction), false);
    in_jit = testFunction();
    assertEq(in_jit, false);

    // Should be in blinterp, but no hint should be set yet.
    assertEq(hasBaselineHint(testFunction), false);
    in_jit = testFunction(); // Trigger baseline compilation.
    assertEq(in_jit, true);

    // testFunction should have been baseline compiled and a hint should also be set now.
    assertEq(hasBaselineHint(testFunction), true);
    in_jit = testFunction();
    assertEq(in_jit, true);
  }
}
