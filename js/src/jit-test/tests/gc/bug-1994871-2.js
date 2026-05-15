// Check a gray symbol keeps a weak map entry alive.

let wm = new WeakMap();
s = Symbol();
wm.set(s, {});
gc();
assertEq(nondeterministicGetWeakMapSize(wm), 1);

grayRoot().push(s);
s = undefined;
gc();
assertEq(nondeterministicGetWeakMapSize(wm), 1);

grayRoot().length = 0;
gc();
assertEq(nondeterministicGetWeakMapSize(wm), 0);
