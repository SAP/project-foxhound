// |jit-test| --enable-symbols-as-weakmap-keys

// Test combinations of arguments in different compartments.

gczeal(0);

let heldValues = [];

function ccwToObject() {
    return evalcx('({})', newGlobal({newCompartment: true}));
}

function newRegistry() {
  return new FinalizationRegistry(value => {
    heldValues.push(value);
  });
}

function ccwToRegistry() {
  let global = newGlobal({newCompartment: true});
  global.heldValues = heldValues;
  return global.eval(
    `new FinalizationRegistry(value => heldValues.push(value))`);
}

function incrementalGC() {
  startgc(1);
  while (gcstate() !== "NotActive") {
    gcslice(1000);
  }
}

const RegistryKinds = ['SameZoneRegistry', 'OtherZoneRegistry'];
function makeRegistry(kind) {
  if (kind === 'SameZoneRegistry') {
    return new FinalizationRegistry(value => {
      heldValues.push(value);
    });
  }

  assertEq(kind, 'OtherZoneRegistry');
  let global = newGlobal({newCompartment: true});
  global.heldValues = heldValues;
  return global.eval(
    `new FinalizationRegistry(value => heldValues.push(value))`);
  return evalcx('({})', newGlobal({newCompartment: true}));
}

const ObjectKinds = ['SameZoneObject', 'OtherZoneObject'];
function makeObject(kind) {
  if (kind === 'SameZoneObject') {
    return {};
  }

  assertEq(kind, 'OtherZoneObject');
  return evalcx('({})', newGlobal({newCompartment: true}));
}

const TargetKinds = ['SameZoneObject', 'OtherZoneObject', 'Symbol'];
function makeTarget(kind) {
  if (kind === 'SameZoneObject') {
    return {};
  }

  if (kind === 'OtherZoneObject') {
    return evalcx('({})', newGlobal({newCompartment: true}));
  }

  assertEq(kind, 'Symbol');
  return Symbol();
}

for (let registryReachable of [false, true]) {
  for (let registryKind of RegistryKinds) {
    for (let targetKind of TargetKinds) {
      for (let heldValueKind of ObjectKinds) {
        for (let tokenKind of TargetKinds) {
          let registry = makeRegistry(registryKind);
          let target = makeTarget(targetKind);
          let heldValue = makeObject(heldValueKind);
          let token = makeTarget(tokenKind);

          registry.register(target, heldValue, token);
          registry.unregister(token);

          registry.register(target, heldValue, token);

          target = undefined;
          token = undefined;
          heldValue = undefined;
          if (!registryReachable) {
            registry = undefined;
          }
          incrementalGC();
          heldValues.length = 0; // Clear, don't replace.
          drainJobQueue();

          if (registryReachable) {
            assertEq(heldValues.length, 1);
          } else {
            // The cleanup callback may or may not be run depending on
            // which order the zones are swept in, which itself depends on
            // the arrangement of CCWs.
            assertEq(heldValues.length <= 1, true);
          }
        }
      }
    }
  }
}
