// Use newGlobal({transplantWindowProxy: wp}) to test different code paths in
// JS_TransplantObject.

// JS_TransplantObject case A: same compartment WindowProxy objects.
function testSameCompartment() {
  let g1 = newGlobal({newCompartment: true});
  g1.evaluate("var id = 1;");
  let g2 = newGlobal({sameCompartmentAs: g1, transplantWindowProxy: g1});
  assertEq(g1, g2);
  assertEq(g1.id, undefined);
  g2.evaluate("var id = 2");
  assertEq(g2.id, 2);
}
testSameCompartment();

// JS_TransplantObject case C: different compartment, no pre-existing CCW.
function testDifferentCompartment() {
  let g1 = newGlobal({newCompartment: true});
  g1.evaluate("var id = 1;");
  let g2 = newGlobal({newCompartment: true, transplantWindowProxy: g1});
  assertEq(g1, g2);
  assertEq(g1.id, undefined);
  g2.evaluate("var id = 2;");
  assertEq(g1.id, 2);
}
testDifferentCompartment();

// JS_TransplantObject case B: different compartment with pre-existing CCW.
function testDifferentCompartmentWithCCW() {
  let g1 = newGlobal({newCompartment: true});
  g1.evaluate("var id = 1;");

  // Pre-create the destination compartment and put a CCW for g1 into its
  // wrapper map.
  let dest = newGlobal({newCompartment: true});
  dest.evaluate("var id = 2;");
  dest.preExistingRef = g1;

  // Create a new global in dest's compartment (where the pre-existing CCW
  // lives) and transplant.
  let g2 = newGlobal({sameCompartmentAs: dest, transplantWindowProxy: g1});
  assertEq(g1, g2);
  assertEq(g1.id, undefined);
  g2.evaluate("var id = 3;");
  assertEq(g1.id, 3);

  assertEq(dest.id, 2);
  assertEq(dest.evaluate("preExistingRef.id"), 3);
}
testDifferentCompartmentWithCCW();
