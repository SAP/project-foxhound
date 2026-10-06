if (!this.enqueueMark) {
  quit(0);
}

gczeal(0);
gc();

// Create objects that need proper weak marking handling
var weakTargets = [];
var weakRefs = [];
var wm = new WeakMap();

for (var i = 0; i < 50; i++) {
  var t = {id: i, data: new Array(20).fill(i)};
  weakTargets.push(t);
  weakRefs.push(new WeakRef(t));
  wm.set(t, {value: i * 2});
}

// Set up mark queue to enter then abort weak marking mode
// This creates objects that won't be marked until weak marking mode,
// then aborts weak marking to fall back on iterative code path
enqueueMark('enter-weak-marking-mode');
for (var i = 0; i < weakTargets.length; i++) {
  enqueueMark(weakTargets[i]);
}
enqueueMark('abort-weak-marking-mode');

// Drop half the strong refs - these should be collected
for (var i = 0; i < 25; i++) {
  weakTargets[i] = null;
}

// GC with aborted weak marking.
startgc(1);
gcslice(1);
gcslice(1);
gcslice(1);
gcslice(1);
finishgc();

// Access weak refs
for (var i = 0; i < weakRefs.length; i++) {
  var d = weakRefs[i].deref();
  if (d) {
    d.id;
    wm.get(d);
  }
}
