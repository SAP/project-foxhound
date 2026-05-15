// |jit-test| --enable-symbols-as-weakmap-keys

// https://tc39.es/ecma262/#sec-addtokeptobjects
// When the abstract operation AddToKeptObjects is called with a target object
// reference, it adds the target to an identity Set that will point strongly at
// the target until the end of the current Job.
//
// https://tc39.es/proposal-weakrefs/#sec-weakref-invariants
// When WeakRef.prototype.deref is called, the referent (if it's not already
// dead) is kept alive so that subsequent, synchronous accesses also return the
// object.

function testSameCompartmentWeakRef(
  targetIsObject,
  targetReachable,
  weakRefReachable) {

  let target;
  if (targetIsObject) {
    target = {};
  } else {
    target = Symbol();
  }

  let weakref = new WeakRef(target);
  assertEq(weakref.deref(), target);

  if (!targetReachable) {
    target = undefined;
  }

  if (!weakRefReachable) {
    weakRef = undefined;
  }

  clearKeptObjects();
  gc();

  if (weakRefReachable) {
    if (targetReachable) {
      assertEq(weakref.deref(), target);
    } else {
      assertEq(weakref.deref(), undefined);
    }
  }
}

let serial = 0;

function testCrossCompartmentWeakRef(
  targetIsObject,
  targetReachable,
  weakRefReachable,
  collectTargetZone,
  collectWeakRefZone,
  sameZone) {

  let id = serial++;
  let global = newGlobal(sameZone ? {sameZoneAs: this} : {newCompartment: true});
  if (targetIsObject) {
    global.eval(`var target = { id: ${id}};`);
  } else {
    global.eval(`var target = Symbol(${id});`);
  }

  let weakref = new WeakRef(global.target);
  // assertEq(weakref.deref(), global.target);

  clearKeptObjects();
  gc();

  if (!targetReachable) {
    global.target = undefined;
  }

  if (!weakRefReachable) {
    weakRef = undefined;
  }

  if (collectTargetZone || collectWeakRefZone) {

    if (collectTargetZone) {
      schedulezone(global);
      if (!targetIsObject) {
        schedulezone("atoms");
        // Bug 1410123: Because we touched in the symbol from the main global
        // we will keep it marked as in use until we collect this zone at the
        // same time as the atoms zone.
        schedulezone(this);
      }
    }
    if (collectWeakRefZone) {
      schedulezone(this);
    }

    // Incremental GC so we use sweep groups. Shrinking GC to test updating
    // pointers.
    startgc(1, 'shrinking');
    while (gcstate() !== 'NotActive') {
      gcslice(1000, {dontStart: true});
    }
  }

  if (!(collectWeakRefZone && !weakRefReachable)) {
    if (targetReachable) {
      assertEq(weakref.deref(), global.target);
    } else if (collectTargetZone) {
      assertEq(weakref.deref(), undefined);
    } else {
      // Target is not strongly reachable but hasn't been collected yet. We
      // can get it back through deref() but must check it based on properties.
      assertEq(weakref.deref() !== undefined, true);
      if (targetIsObject) {
        assertEq(weakref.deref().id, id);
      } else {
        assertEq(weakref.deref().description, id.toString());
      }
    }
  }
}

gczeal(0);

new WeakRef(Symbol());
new WeakRef(Symbol("foo"));

for (let targetIsObject of [true, false]) {
  for (let targetReachable of [true, false]) {
    for (let weakRefReachable of [true, false]) {
      testSameCompartmentWeakRef(targetIsObject, targetReachable, weakRefReachable);
    }
  }
}

for (let targetIsObject of [true, false]) {
  for (let targetReachable of [true, false]) {
    for (let weakRefReachable of [true, false]) {
      for (let collectTargetZone of [true, false]) {
        for (let collectWeakRefZone of [true, false]) {
          for (let sameZone of [true, false]) {
            if (sameZone && (collectTargetZone != collectWeakRefZone)) {
              continue;
            }

            testCrossCompartmentWeakRef(targetIsObject, targetReachable, weakRefReachable,
                                        collectTargetZone, collectWeakRefZone, sameZone);
          }
        }
      }
    }
  }
}
