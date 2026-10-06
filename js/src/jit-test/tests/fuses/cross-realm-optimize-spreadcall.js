// Test for JSOp::OptimizeSpreadCall with a cross-realm array.
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
    var str = getArgs(...gArr);
    assertEq(str, i <= 60 ? "1,2,3" : "");
    maybePopFuse(g, i);
  }
}
test();
