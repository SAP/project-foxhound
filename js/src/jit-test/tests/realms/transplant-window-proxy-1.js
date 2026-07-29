// Test transplanting the script's top-level WindowProxy.

var id = 1;
assertEq(objectGlobal(globalThis), globalThis); // Not a CCW.

// Turn the WindowProxy into a CCW for a WindowProxy in a new compartment.
var g2 = newGlobal({newCompartment: true, transplantWindowProxy: this});
g2.evaluate("var id = 2");
assertEq(objectGlobal(globalThis), null); // Now it's a CCW.
assertEq(id, 1);
assertEq(globalThis.id, 2);

// Same thing for another new compartment.
var g3 = newGlobal({newCompartment: true, transplantWindowProxy: this});
g3.evaluate("var id = 3");
assertEq(objectGlobal(globalThis), null); // Still a CCW.
assertEq(id, 1);
assertEq(globalThis.id, 3);

// The CCW becomes a WindowProxy in the original compartment.
var g4 = newGlobal({newCompartment: false, transplantWindowProxy: this});
g4.evaluate("var id = 4");
assertEq(objectGlobal(globalThis), globalThis); // Not a CCW anymore.
assertEq(id, 1);
assertEq(globalThis.id, 4);

// And back to a CCW.
var g5 = newGlobal({newCompartment: true, transplantWindowProxy: this});
g5.evaluate("var id = 5");
assertEq(objectGlobal(globalThis), null); // Again a CCW.
assertEq(id, 1);
assertEq(globalThis.id, 5);

assertEq(globalThis, g2);
assertEq(globalThis, g3);
assertEq(globalThis, g4);
assertEq(globalThis, g5);

// An exception is thrown for non-WindowProxy objects.
var plainGlobal = newGlobal({useWindowProxy: false});
var exc = null;
try {
  newGlobal({transplantWindowProxy: plainGlobal});
} catch (e) {
  exc = e;
}
assertEq(exc.toString().includes("not a WindowProxy"), true);
