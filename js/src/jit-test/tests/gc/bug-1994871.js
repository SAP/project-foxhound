// Check that atom marking bitmap state and mark color is as expected and
// AtomMarkingRuntime::refineZoneBitmapsForCollectedZones works with gray
// symbols.

gczeal(0);

// We'll track the state of a symbol in two zones, |this| and |other|.
let s = Symbol();
addMarkObservers([s]);
let other = newGlobal({newCompartment: true});

// Iniitally we expect the symbol to be marked black in |this| and not marked
// in |other|.
gc();
let index = getAtomMarkIndex(s);
assertEq(getAtomMarkColor(this, index), 'black');
assertEq(getAtomMarkColor(other, index), 'white');
assertEq(getMarks()[0], 'black');

// Referencing the symbol in |other| marks it in that zone.
other.s = s;
assertEq(getAtomMarkColor(other, index), 'black');

// Replace existing references with a gray reference from |this| and remove
// the reference from |other|. We now expect the mark color to be gray in
// *both* zones.
grayRoot().push(s);
other.s = undefined;
s = undefined;
gc();
assertEq(getAtomMarkColor(this, index), 'gray');
assertEq(getAtomMarkColor(other, index), 'gray'); 
assertEq(getMarks()[0], 'gray');

// Removing the final reference results in the mark color going to white.
grayRoot().length = 0;
gc();
assertEq(getAtomMarkColor(this, index), 'white');
assertEq(getAtomMarkColor(other, index), 'white');
assertEq(getMarks()[0], 'dead');
