function makeGlobal(newZone) {
  let options = {};
  if (newZone) {
    // Set newCompartmentAndZone.
    options.newCompartment = true;  
  } else {
    // Set newCompartmentInExistingZone.
    options.sameZoneAs = this; 
  }

  let g = newGlobal(options);
  assertEq(isSameCompartment(this, g), false);
  assertEq(isCCW(g), true);

  return g;
}

function nuke(global, nukeAll) {
  if (nukeAll) {
    // Nuke all CCWs into test global's realm.
    global.eval('nukeAllCCWs()');
  } else {
    // Only nuke the CCW to the global itself.
    nukeCCW(global);
  }
}

function testWeakRefAfterNukeCCWs(nukeAll, newZone) {
  let g = makeGlobal(newZone);

  let wr = new WeakRef(g);
  clearKeptObjects();
  gc();

  nuke(g, nukeAll);

  assertEq(wr.deref() === undefined, true);
}

testWeakRefAfterNukeCCWs(true, true);
testWeakRefAfterNukeCCWs(true, false);
testWeakRefAfterNukeCCWs(false, true);
testWeakRefAfterNukeCCWs(false, false);
