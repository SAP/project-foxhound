// Test GetProp and SetProp on (transplanted) WindowProxy objects.

function test(sameCompartment) {
  let g1 = newGlobal({newCompartment: true});
  g1.evaluate(`
    var x = 10;
    function incX() {
      for (var i = 0; i < 100; i++) {
        x = x + 1; // Always g1.
        globalThis.x = globalThis.x + 1; // The WindowProxy's current global.
      }
      return x;
    }
  `);

  // g1 is the WindowProxy's active Window so g1.x is incremented 200 times.
  let incX = g1.incX;
  assertEq(incX(), 210);
  assertEq(g1.x, 210);

  let g2 =
    sameCompartment
      ? newGlobal({sameCompartmentAs: g1, transplantWindowProxy: g1})
      : newGlobal({newCompartment: true, transplantWindowProxy: g1});
  assertEq(g1, g2);
  g2.evaluate("var x = 20;");

  // Now g2 is the WindowProxy's active Window so g1.x (for the original g1) and
  // g2.x are each incremented 100 times.
  assertEq(incX(), 310);
  assertEq(g2.x, 120);
}
test(false);
test(true);
