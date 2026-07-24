// |jit-test| --no-jit-backend

setBaselineHint("a");
assertEq(hasBaselineHint("a"), false);
