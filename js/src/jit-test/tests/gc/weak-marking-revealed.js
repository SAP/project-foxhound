// This is really just a minimal example of how to ensure that the weak marking
// mode is required.

gczeal(0);

function big_graph() {
  const root = {};
  let obj = root;
  for (let i = 0; i < 100000; i++) {
    obj = obj.o = {};
  }
  return root;
}

// "Hide" a large graph behind a WeakMap so that it gets traversed in weak
// marking mode.
//
// Whichever weakmap is traced first (almost certainly wm1 here) will have an
// unmarked key (mid2) that maps to the big graph. But that key is not reachable
// until the other weakmap is traced, so it will only happen when weak marking
// mode is entered.
var wm1 = new WeakMap();
var wm2 = new WeakMap();
var keys = [{}, {}];
var mid1 = {};
var mid2 = {};
var big1 = big_graph();
var big2 = big_graph();
gc();

wm1.set(keys[0], mid1);
var big = big_graph();
wm2.set(mid1, big1);
wm2.set(keys[1], mid2);
wm1.set(mid2, big2);
addMarkObservers([ big1, big2, mid1, mid2 ]);
big1 = big2 = null;
mid1 = mid2 = null;
gc();
var marks = JSON.stringify(getMarks());
print("Marks: " + marks);
assertEq(marks, '["black","black","black","black"]');
