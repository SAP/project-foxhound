// |jit-test| skip-if: getBuildConfiguration("tsan")

gczeal(9, 100);
let g = newGlobal({newCompartment: true});
with (g) {
  for (let i = 0; i < 5000; i++) {
    (() => {
      let c = [];
      let d = [];
      let e = new FinalizationRegistry(Object);
      e.register(c);
      e.register(d);
      new Int8Array(294967295);
    })();
  }
}
