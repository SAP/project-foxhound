// |jit-test| --blinterp-eager

function foo() { return -"2147483648"; }
foo();

// Verify that we attached StringToNumber instead of StringToInt32
// when the input is not a valid Int32.
let ICs = disblic(foo);
assertEq(/oGuardStringToInt32/.test(ICs), false);
