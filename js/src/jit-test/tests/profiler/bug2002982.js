// Test that script sources are properly registered on consecutive profiler runs.
// Bug 2002982: When the profiler is disabled and re-enabled, script sources
// need to be re-registered because the profiler's ScriptSources hashset is
// cleared on stop. Previously, ensureProfileString would return early if
// profileString_ was already set. And that was causing us to never re-insert
// the script source.

// Set a low warmup threshold to trigger baseline compilation.
setJitCompilerOption("baseline.warmup.trigger", 5);

// A simple function that will be JIT'ed.
function compute(x) {
  return x * x;
}

enableGeckoProfiling();

// Warm up with the profiler enabled. It creates JitScripts and registers
// their sources.
for (let i = 0; i < 10; i++) {
  compute(i);
}

// Get how many sources are registered so far.
const countBefore = getGeckoProfilingScriptSourcesCount();
assertEq(countBefore > 0, true,
  "Expected to have at least one registered script source");

disableGeckoProfiling();
enableGeckoProfiling();

// Run the same code
for (let i = 0; i < 10; i++) {
  compute(i);
}

// Get how many sources are registered so far again, and compare the before and
// after values. The numbers have to be the same.
const countAfter = getGeckoProfilingScriptSourcesCount();
assertEq(countAfter, countBefore,
  `Expected the same amount of script sources to be registered. Before: ${countBefore}, After: ${countAfter}`);

disableGeckoProfiling();
