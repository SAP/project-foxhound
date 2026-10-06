function testWeakRefAfterTransplant(global) {
  let {object, transplant} = transplantableObject();
  object.x = 42;

  let wr = new WeakRef(object);
  transplant(global);

  transplant = undefined;
  global.object = object;
  object = undefined;
  clearKeptObjects();
  gc();

  assertEq(wr.deref() !== undefined, true);
  assertEq(wr.deref().x, 42);

  global.object = undefined;
  clearKeptObjects();
  gc();

  assertEq(wr.deref(), undefined);
}

gczeal(0);
testWeakRefAfterTransplant(this);
testWeakRefAfterTransplant(newGlobal({sameZoneAs: this}));
testWeakRefAfterTransplant(newGlobal({newCompartment: true}));
