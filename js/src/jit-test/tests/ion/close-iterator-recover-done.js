// |jit-test| --fast-warmup

// Test that CloseLiveIteratorIon correctly reads the "done" slot when it's
// encoded as a RECOVER_INSTRUCTION in the snapshot.

function test() {
  var idx = 0;
  var returned = 0;
  var iter = {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      // Use int32|0 to get the instruction marked as recover-on-bailout in
      // removeUnnecessaryBitops.
      return {value: 0, done: (++idx & 1) | 0};
    },
    return() {
      returned++;
      return {value: undefined, done: true};
    }
  };
  var count = 0;
  var obj = {
    set x(v) {
      if (++count >= 2800) {
        throw "bang";
      }
    }
  };
  var trigger = function() {
    for (var i = 0; i < 3000; i++) {
      try {
        [obj.x] = iter;
      } catch (e) { }
    }
  };
  trigger();
  assertEq(returned, 1500);
}
test();
