// |jit-test| --blinterp-warmup-threshold=1000; --baseline-warmup-threshold=1000
// Simple test to make sure we enter baseline eagerly if a hint is set.

if (typeof getJitCompilerOptions == "function" && 
    typeof inJit == "function" && 
    typeof setBaselineHint == "function" && 
    typeof hasBaselineHint == "function") {

  var jco = getJitCompilerOptions();
  if (jco["baseline.enable"] && jco["blinterp.enable"] &&
    jco["blinterp.warmup.trigger"] == 1000 &&
    jco["baseline.warmup.trigger"] == 1000) {

    function testFunction() {
      return inJit();
    }

    // Confirm not in baseline.
    assertEq(hasBaselineHint(testFunction), false);
    in_jit = testFunction();
    assertEq(in_jit, false);

    // Set an eager baseline hint.
    setBaselineHint(testFunction);
    assertEq(hasBaselineHint(testFunction), true);

    // Confirm testFunction is now in baseline even though
    // threshold has not been reached.
    in_jit = testFunction();
    assertEq(in_jit, true);
  }
}
