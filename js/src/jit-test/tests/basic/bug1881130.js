// |jit-test| --fuzzing-safe

setInterruptCallback("print('hello world'); true");
interruptIf(true);
for (var i = 0; i < 10; i++) {}

// Function callback not available in --fuzzing-safe
let threw = false;
try {
  setInterruptCallback(() => { return true; });
} catch {
  threw = true;
}
assertEq(threw, true);
