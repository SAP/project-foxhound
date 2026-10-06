// Disable gczeal if available (debug builds have it, asan/release don't)
gczeal(0);

// Enable per-zone GC
gcparam('perZoneGCEnabled', 1);

// Create uncollected zone with gray root holding a symbol
var z2 = newGlobal({newCompartment: true});
z2.evaluate(`
  function storeGray(s) {
    var o = {};
    o[s] = 1;
    grayRoot().push(o);
  }
`);

// Create WeakMap in main zone
var wm = new WeakMap();

// Create symbol and value in a function scope to avoid stack scanning
function setup() {
  var s = Symbol("key");
  z2.storeGray(s);
  var val = {data: new ArrayBuffer(256)};
  wm.set(s, val);
  // s and val go out of scope when function returns
}
setup();

// Full GCs to establish gray state and refine bitmaps
// After these GCs, the symbol is gray in z2's bitmap (gray-only after refinement)
gc();
gc();

// Zone GC: collect main zone + atoms, leave z2 uncollected
schedulezone(this);
schedulezone('atoms');
startgc(1);
while (gcstate() === 'Prepare') { gcslice(10); }
finishgc();

gc();
