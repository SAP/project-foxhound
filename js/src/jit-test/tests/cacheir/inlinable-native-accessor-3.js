// Test calling an inlinable native function as an accessor on a WindowProxy.

var window = newGlobal({useWindowProxy: true});

// GetPropIRGenerator::tryAttachWindowProxy only attaches a stub if the current
// script global matches the window proxy, therefore we have to evaluate the
// test in |window|'s global environment.
window.eval(`
var window = this;

// Use Math.random because it can be called with any |this| value.
Object.defineProperty(window, "random", {
  get: Math.random,
});

function testRandom() {
  for (var i = 0; i < 100; ++i) {
    var r = window.random;
    assertEq(0 <= r && r < 1, true);
  }
}
testRandom();
`);
