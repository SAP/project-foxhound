// Check that Ion JIT weak map value read barrier (MacroAssembler::
// emitValueReadBarrierFastPath, which calls out to
// js::jit::WeakMapValueReadBarrier) matches the VM version
// WeakMap::valueReadBarrier.
//
// This test puts symbols into weak maps as values and arranges for them to be
// black in the shared atoms-zone mark bits but only gray in this zone's atom
// marking bitmap. Reading such a symbol back out of a weak map should promote
// this zone's atom mark colour to black.

gczeal(0);
setJitCompilerOption("ion.warmup.trigger", 30);
setJitCompilerOption("baseline.warmup.trigger", 10);
setJitCompilerOption("offthread-compilation.enable", 0);

// A second zone holds the symbols via ordinary (black) references, keeping them
// black in the shared atoms-zone mark bits regardless of this zone's GCs.
let g = newGlobal({newCompartment: true});
g.eval('var s1 = Symbol("s1"); var s2 = Symbol("s2");');
let i1 = g.eval('getAtomMarkIndex(s1)');
let i2 = g.eval('getAtomMarkIndex(s2)');

// This zone references the symbols only as values of gray weak maps. The keys
// are kept alive so the entries (and their symbol values) survive.
let key1 = {};
let key2 = {};
(function() {
  let wm1 = new WeakMap();
  let wm2 = new WeakMap();
  wm1.set(key1, g.s1);
  wm2.set(key2, g.s2);
  grayRoot()[0] = wm1;
  grayRoot()[1] = wm2;
})();

// Warm up an Ion-compiled getter on a throwaway weak map (object value) so it
// uses emitValueReadBarrierFastPath, without reading our symbols through a
// lower tier. Assigning the result keeps the load from being optimized away.
function readJit(m, k) {
  globalThis.sink = m.get(k);
  return inIon();
}
let throwawayMap = new WeakMap();
let throwawayKey = {};
throwawayMap.set(throwawayKey, {});
for (let i = 0; i < 5000; i++) {
  readJit(throwawayMap, throwawayKey);
}

// Collect this zone and the atoms zone but not |g|. Within the collected set
// the symbols are only reachable as gray weak map values, so this zone's atom
// marking bitmap is refined down to gray. The symbols stay black in the shared
// atoms-zone mark bits because |g| (uncollected) keeps them black.
schedulezone(this);
schedulezone('atoms');
gc('zone');

assertEq(getAtomMarkColor(this, i1), 'gray');
assertEq(getAtomMarkColor(this, i2), 'gray');
assertEq(getAtomMarkColor(g, i1), 'black');
assertEq(getAtomMarkColor(g, i2), 'black');

// Note: comparing a result against |g.s1| / |g.s2| would itself read the symbol
// into this zone and mark it, so we only check the result is a symbol.

// VM path: a single interpreter call runs WeakMap::valueReadBarrier, which
// marks the symbol black in this zone's atom marking bitmap.
function readVM(m, k) { return m.get(k); }
assertEq(typeof readVM(grayRoot()[0], key1), 'symbol');
assertEq(getAtomMarkColor(this, i1), 'black');

// JIT path: the same read via Ion. 
readJit(grayRoot()[1], key2);
assertEq(typeof globalThis.sink, 'symbol');
assertEq(getAtomMarkColor(this, i2), 'black');
