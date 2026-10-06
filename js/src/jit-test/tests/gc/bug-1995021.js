// Test basic behaviour of weak maps with nursery keys.

gczeal(0);

let wm = new WeakMap();

function size() {
  return nondeterministicGetWeakMapSize(wm);
}

assertEq(size(), 0);

wm.set({}, {});
assertEq(size(), 1);

minorgc();
assertEq(size(), 0);

let o = {};
wm.set(o, {});
minorgc();
assertEq(size(), 1);

o = undefined;
gc();
assertEq(size(), 0);

let g = newGlobal({newCompartment: true});
o = g.eval('new Object()');
wm.set(o, {});
minorgc();
assertEq(size(), 1);

o = undefined;
gc();
assertEq(size(), 0);
