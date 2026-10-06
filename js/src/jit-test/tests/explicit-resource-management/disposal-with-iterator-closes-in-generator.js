load(libdir + "asserts.js");

{
  let disposed = [];
  function* gen1() {
    for (using _ of [
      {
        [Symbol.dispose]() {
          disposed.push("A");
        },
      },
      {
        [Symbol.dispose]() {
          disposed.push("B");
        },
      },
    ]) {
      yield;
    }
  }
  let it1 = gen1();
  it1.next();
  it1.next();
  it1.return();
  assertArrayEq(disposed, ["A", "B"]);
}

{
  let disposed = [];
  function* gen4() {
    for (using _ of [
      {
        [Symbol.dispose]() {
          disposed.push("A");
        },
      },
    ]) {
      yield;
    }
  }
  for (const _ of gen4()) {
    break;
  }
  assertArrayEq(disposed, ["A"]);
}

{
  let disposed = false;
  async function* gen6() {
    for (using _ of [
      {
        [Symbol.dispose]() {
          disposed = true;
        },
      },
    ]) {
      yield;
    }
  }
  async function disposeWithBreakOfGenerator() {
    for await (const _ of gen6()) {
      break;
    }
  }
  let thenCalled = false;
  disposeWithBreakOfGenerator().then(() => {
    assertEq(disposed, true);
    thenCalled = true;
  });
  drainJobQueue();
  assertEq(thenCalled, true);
}
