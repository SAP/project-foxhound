// |jit-test|  --more-compartments;

var called = false;
// A dead wrapper in the job queue shouldn't crash.
newGlobal().Promise.resolve().then(() => {
  called = true;
});
nukeAllCCWs();

drainJobQueue();

// The job should be skipped.
assertEq(called, false);
