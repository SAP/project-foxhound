load(libdir + "asm.js");

let useCounters = getUseCounterResults();
// No asm.js modules will have been instantiated yet.
assertEq(useCounters.AsmJS, 0);
// We will have seen one "use asm" for `valid` when this script has been parsed.
assertEq(useCounters.UseAsm, 1);
// No wasm is being used.
assertEq(useCounters.Wasm, 0);

// Do an imperative asm.js compilation.
asmLink(asmCompile(
  USE_ASM +
  "function f(i) { i=i|0; return (i*2)|0 } return f"
));

// Do an imperative asm.js compilation that is invalid.
Function.apply(null, [USE_ASM+"function f(){i=i|0} function g() { f(0) } return g"]);

// Define an asm.js function normally as part of this script.
function valid() {
  "use asm";
  function f(i) { i=i|0; return (i*2)|0 } return f;
}
let f = valid();
assertEq(f(0), 0);
assertEq(f(1), 2);

useCounters = getUseCounterResults();
// If asm.js is enabled, then we have instantiated two valid modules.
assertEq(useCounters.AsmJS, isAsmJSCompilationAvailable() ? 2 : 0);
// Even if asm.js is not enabled, we have seen three "use asm" directives.
assertEq(useCounters.UseAsm, 3);
// No wasm is being used.
assertEq(useCounters.Wasm, 0);
