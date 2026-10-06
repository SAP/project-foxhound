// Test for JSOp::OptimizeGetIterator with a cross-realm array.
function getArgs(...args) {
  return args.join();
}
function maybePopFuse(g, i) {
  with (this) {} // No inlining.
  if (i === 60) {
    g.evaluate(`
      let counter = 0;
      const ArrayIteratorPrototype = Object.getPrototypeOf([][Symbol.iterator]());
      ArrayIteratorPrototype.next = function() {
        counter++;
        return {done: true};
      };
    `);
    assertEq(g.getFuseState().OptimizeGetIteratorFuse.intact, false);
    assertEq(getFuseState().OptimizeGetIteratorFuse.intact, true);
  }
}
function test() {
  var g = newGlobal({sameCompartmentAs: this});
  var gArr = g.evaluate("[1, 2, 3]");

  for (var i = 0; i < 100; i++) {
    var [x, y, z] = gArr;
    assertEq(z, i <= 60 ? 3 : undefined);
    maybePopFuse(g, i);
  }
}
test();
