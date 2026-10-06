function testFinalizationRegistryAfterTransplant(global) {
  let cleanedUp = [];
  let registry = new FinalizationRegistry(value => cleanedUp.push(value));

  let {object, transplant} = transplantableObject();
  object.x = 42;

  registry.register(object, "held-value");
  transplant(global);

  transplant = undefined;
  global.object = object;
  object = undefined;
  gc();
  drainJobQueue();

  assertEq(cleanedUp.length, 0);

  global.object = undefined;
  gc();
  drainJobQueue();

  assertEq(cleanedUp.length, 1);
  assertEq(cleanedUp[0], "held-value");
}

gczeal(0);
testFinalizationRegistryAfterTransplant(this);
testFinalizationRegistryAfterTransplant(newGlobal({sameZoneAs: this}));
testFinalizationRegistryAfterTransplant(newGlobal({newCompartment: true}));
