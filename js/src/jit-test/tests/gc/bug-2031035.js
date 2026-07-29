// The content zone has a sweep group edge to the atoms zone, placing the
// content zone in an earlier sweep group. A reverse edge (atoms -> content) is
// only added when gcWeakMapsMayHaveSymbolKeys_ is true. If a symbol key is
// added to a WeakMap after sweep groups are formed but before the zone's
// WeakMaps are swept, the atoms zone is still in a marking state when the
// symbol edge is traced during sweeping.

gczeal(0);

var wms = [];
var keys = [];
for (var i = 0; i < 1; i++) {
  var wm = new WeakMap();
  var k = {};
  wm.set(k, {data: 1});
  wms.push(wm);
  keys.push(k);
}

startgc(1);

while (gcstate() !== "NotActive") {
  // When the overall GC is in the Sweep phase but our zone is still in
  // MarkBlackAndGray, sweep groups have been formed but WeakMaps have not
  // been swept yet. Adding a symbol key here sets the zone flag too late
  // for sweep group edge computation.
  if (gcstate() === "Sweep" && gcstate(wms[0]) === "MarkBlackAndGray") {
    wms[0].set(Symbol(), 0);
  }
  gcslice(5);
}
