// |jit-test| slow

gczeal(0);
gcparam("parallelMarkingThresholdMB", 0);
var g1 = newGlobal();
var g2 = newGlobal({ sameZoneAs: g1 });
g2.evaluate("enableTrackAllocations()");

for (let i = 0; i < 50; i++) {
  print(i);
  const f = () => {
    let objects = [];
    objects.push(newObjectWithCallHook());
    objects.push(createIsHTMLDDA());
    objects.push(g1);
    objects.push(g2);
    const ws = new WeakSet(objects);
    objects = gc();
    objects = null;
    gc();
  };
  try { f(); } catch (e) {}
  oomTest(f);
}
