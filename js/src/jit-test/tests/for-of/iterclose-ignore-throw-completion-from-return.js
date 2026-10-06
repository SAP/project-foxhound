var iterable = {
  [Symbol.iterator]() {
    return this;
  },
  next() {
    return { done: false };
  },
  return() {
    // This exception should be ignored.
    throw "ReturnError";
  }
};

function test() {
  try {
    for (var v of iterable) {
      throw "NextError";
    }
  } catch (e) {
    assertEq(e, "NextError");
  }
}

for (var i = 0; i < 100; ++i) {
  test();
}
