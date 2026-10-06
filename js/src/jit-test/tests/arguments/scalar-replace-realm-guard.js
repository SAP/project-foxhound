// |jit-test| --fast-warmup; --no-threads

gczeal(0);

function sum() {
  var s = 0;
  for (var i = 0; i < arguments.length; i++) {
    s += arguments[i];
  }
  return s;
}

// OptimizeSpreadCall fast path.
function testSpread() {
  assertRecoveredOnBailout(arguments, true);
  return sum(...arguments);
}

// arguments[@@iterator] fast path.
function testIterator() {
  assertRecoveredOnBailout(arguments, true);
  return arguments[Symbol.iterator];
}

function test() {
  with ({}) {} // Don't Ion-compile this function.
  for (var i = 0; i < 100; i++) {
    assertEq(testSpread(1, 2, 3), 6);
    assertEq(typeof testIterator(1, 2, 3), "function");
  }
}
test();
