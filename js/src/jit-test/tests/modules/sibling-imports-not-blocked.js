// |jit-test| module;
const { checkMicrotask } = await import("sibling-imports-not-blocked__microtask__parent.js");
assertEq(checkMicrotask, "PASS");
