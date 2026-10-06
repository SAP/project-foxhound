// |jit-test| skip-if: !getJitCompilerOptions()['ion.enable']; --ion-eager

// Test the telemetry added in Bug 1944683.

// The nested loop satisfies YieldAnalyzer (js/src/jit/BytecodeAnalysis.cpp)
// which only allows Ion compilation of a yielding loop when it contains an
// inner loop or sufficient bytecode.
function* gen() {
  for (let i = 0; i < 1; i++) {
    for (let j = 0; j < 0; j++) {}
    yield i;
  }
}
async function* asyncGen() {
  for (let i = 0; i < 1; i++) {
    for (let j = 0; j < 0; j++) {}
    yield i;
  }
}

let useCounters = getUseCounterResults();
assertEq(useCounters.GeneratorFunctionCreated, 0);
assertEq(useCounters.AsyncGeneratorFunctionCreated, 0);
assertEq(useCounters.GeneratorFunctionIonEligible, 0);
assertEq(useCounters.AsyncGeneratorFunctionIonEligible, 0);

gen();
asyncGen();
useCounters = getUseCounterResults();
assertEq(useCounters.GeneratorFunctionCreated, 1);
assertEq(useCounters.AsyncGeneratorFunctionCreated, 1);

gen();
useCounters = getUseCounterResults();
assertEq(useCounters.GeneratorFunctionCreated, 2);
assertEq(useCounters.AsyncGeneratorFunctionCreated, 1);

const GeneratorFunction = function*(){}.constructor;
const AsyncGeneratorFunction = async function*(){}.constructor;
GeneratorFunction("yield 1;")();
AsyncGeneratorFunction("yield 1;")();
useCounters = getUseCounterResults();
assertEq(useCounters.GeneratorFunctionCreated, 3);
assertEq(useCounters.AsyncGeneratorFunctionCreated, 2);

for (let i = 0; i < 10; i++) {
  gen().next();
}
useCounters = getUseCounterResults();

// Use-counters deduplicate per-document in product code, so we only
// check that the counter has fired.
assertEq(useCounters.GeneratorFunctionIonEligible >= 1, true);

for (let i = 0; i < 10; i++) {
  asyncGen().next();
}
useCounters = getUseCounterResults();
assertEq(useCounters.AsyncGeneratorFunctionIonEligible >= 1, true);
