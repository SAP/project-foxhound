gczeal(0);

const gC = newGlobal({newCompartment: true}); // zone C: transplantable targets (not collected)
const gZ = newGlobal({newCompartment: true}); // zone Z: dead weakrefs (collected)
const gD = newGlobal({newCompartment: true}); // zone D: transplant destination (not collected)

const NT = 64;       // number of important weakref/target pairs
const NFILLER = 200000; // dead weakrefs in Z to stall foreground finalization

gC.evaluate(`
  var pairs = [];
  for (let i = 0; i < ${NT}; i++) pairs.push(transplantableObject());
`);

gZ.evaluate(`
  function makeWeak(t) { new WeakRef(t); }
  function filler(n) {
    let keep = [];
    for (let i = 0; i < n; i++) { let o = {i: i}; keep.push(o); new WeakRef(o); }
    return keep;
  }
`);

// Fillers first: their (dead) weakrefs are finalized first and stall
// foreground finalization across many slices. Targets stay alive via `keep`.
let keep = gZ.filler(NFILLER);

// Important weakrefs last: their arenas are finalized last.
for (let i = 0; i < NT; i++) {
  gZ.makeWeak(gC.pairs[i].object);
}

// Clean nursery + store buffer before starting; tenure everything live.
minorgc();

// Incremental GC collecting ONLY zone Z.
schedulezone(gZ);
startgc(1);

let transplanted = 0;
let sliceCount = 0;
while (gcstate() !== "NotActive") {
  gcslice(10000, {dontStart: true});
  sliceCount++;
  if (gcstate() === "Sweep" && transplanted < NT) {
    for (let k = 0; k < 4 && transplanted < NT; k++) {
      // Transplant target into zone D. The new identity proxy is
      // nursery-allocated; relocateFinalizationObserverTarget writes it into
      // the dead WeakRef's TargetSlot -> whole-cell entry for dead cell.
      gC.pairs[transplanted].transplant(gD);
      transplanted++;
    }
  }
  if (sliceCount > 10000) { break; }
}

minorgc();
