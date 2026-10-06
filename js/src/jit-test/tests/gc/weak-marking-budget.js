// Make enterWeakMarkingMode expensive so it gets forced into a single slice.

// We need full control here.
gcparam("concurrentMarkingEnabled", 0);
gczeal(0);
gc();
assertEq(gcstate(), "NotActive");

function checkFinishMarkingDuringSweeping(expected) {
  if (hasFunction["currentgc"]) {
    assertEq(currentgc().finishMarkingDuringSweeping, expected);
  }
}

var keys = [];
var maps = Array(1000).fill().map(() => new WeakMap);
for (const map of maps) {
  for (let i = 0; i < 100; i++) {
    // The key will die the next major collection , but will need to be put
    // into the ephemeron table first.
    let key = {};
    keys.push(key);
    map.set(key, {}); 
  }
}

minorgc();
keys = undefined;

// Slowly work forward until we reach Mark.
startgc(10);
while (["Prepare", "MarkRoots"].includes(gcstate())) {
    gcslice(10);
}
assertEq(gcstate(), "Mark");

// Then continue until we reach Sweep.
//
// The last mark slice will yield before leaving marking, in order to give the
// first sweep slice a full budget.
//
// The first Sweep slice will hit the long enterWeakMarkingMode and yield as
// soon as the budget runs out, and set up the next Sweep slice to finish.
while (gcstate() === "Mark") {
    gcslice(10000);
}
assertEq(gcstate(), "Sweep");
checkFinishMarkingDuringSweeping(true);

// This slice will finish the marking, but will go way over budget and so will
// yield as soon as the marking is done. This will still be during Sweep (in the
// middle of sweepWeakCaches).
//
// Use more than gcslice(1) because it is possible to get a few things added to
// the mark stack from read barriers.
gcslice(100);
assertEq(gcstate(), "Sweep");
checkFinishMarkingDuringSweeping(false);

// There's still a lot of sweeping left to do, because all of the dead stuff
// needs to be finalized.
finishgc();

// Do another GC without a slow enterWMM, to confirm that the extra slice is not
// requested. (The previous GC will have thrown out all of the WeakMaps'
// entries, so this will just be doing one step for each of the 1000 WeakMaps
// instead of 1000 * (1 + 100) for the WeakMaps plus their keys.)
startgc(10);
while (["Prepare", "MarkRoots"].includes(gcstate())) {
    gcslice(10);
}
assertEq(gcstate(), "Mark");

while (gcstate() === "Mark") {
    gcslice(100);
}
assertEq(gcstate(), "Sweep");
checkFinishMarkingDuringSweeping(false);

gcslice(1);
assertEq(gcstate(), "Sweep");
checkFinishMarkingDuringSweeping(false);
