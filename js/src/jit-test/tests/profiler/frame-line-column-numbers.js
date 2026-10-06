// |jit-test| skip-if: !getJitCompilerOptions()['baseline.enable'] && !getJitCompilerOptions()['ion.enable']
// Test that JIT frames (both Baseline and Ion) report accurate line and column
// numbers when captured via the Gecko profiler. This verifies that the profiler
// correctly attributes stack samples to the source line where execution occurs.

setJitCompilerOption("baseline.warmup.trigger", 0);
setJitCompilerOption("ion.warmup.trigger", 10);

// Update these values if the line and column numbers of readGeckoProfilingStack
// call inside testLoop changes.
const EXPECTED_LINE = 22;
const EXPECTED_COLUMN = 17;
// Run enough iterations to ensure JIT compilation occurs.
const ITERATION_COUNT = 100;
const stacks = [];

function testLoop() {
  const items = Array.from({ length: ITERATION_COUNT }, (_, i) => i);

  for (const item of items) {
    Math.abs(item);
    stacks.push(readGeckoProfilingStack());
    Math.cos(item);
  }
}

enableGeckoProfiling();
testLoop();
disableGeckoProfiling();

assertEq(stacks.length, ITERATION_COUNT, "Should have captured the expected number of stacks");

let stacksWithCorrectFrame = 0;
let stacksWithIncorrectFrame = 0;

// Now let's check that the `testLoop` frame line/column numbers are attributed
// to the correct ones. We need to skip the baseline-interpreter frames because
// the line/column number collection of them happens in a different location.
for (const stack of stacks) {
  for (const physicalFrame of stack) {
    const testLoopFrame = physicalFrame.find(
      frame =>
        frame.label &&
        frame.label.includes("testLoop") &&
        frame.kind !== "baseline-interpreter"
    );

    if (testLoopFrame) {
      if (
        testLoopFrame.line === EXPECTED_LINE &&
        testLoopFrame.column === EXPECTED_COLUMN
      ) {
        stacksWithCorrectFrame++;
      } else {
        print(
          `ERROR: testLoop line ${testLoopFrame.line} and column ${testLoopFrame.column} is outside expected line ${EXPECTED_LINE} and column ${EXPECTED_COLUMN} (kind: ${testLoopFrame.kind})`
        );
        stacksWithIncorrectFrame++;
      }
    }
  }
}

print(`Total stacks captured: ${stacks.length}`);
print(`Stacks with correct testLoop frame: ${stacksWithCorrectFrame}`);
print(`Stacks with incorrect testLoop frame: ${stacksWithIncorrectFrame}`);

assertEq(stacksWithCorrectFrame > 0, true, "Should have captured some correct JIT frames");
assertEq(stacksWithIncorrectFrame, 0, "All JIT frames should have correct line numbers");
