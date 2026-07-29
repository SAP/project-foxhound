{
  const brokenPromise = new Promise(() => {});
  Object.defineProperty(brokenPromise, "constructor", {
    get() { throw "broken constructor"; }
  });

  async function* gen() {
    try {
      await brokenPromise;
    } catch (e) {
      yield "caught:" + e;
    }
  }

  let fulfilledValue = undefined;
  const g = gen();
  g.next().then(v => {
    fulfilledValue = v.value;
  });
  drainJobQueue();
  assertEq(fulfilledValue, "caught:broken constructor");
}

{
  async function* gen() {
    await undefined;
    yield 1;
  }

  const g = gen();
  g.next();

  const bp = Promise.resolve();
  Object.defineProperty(bp, "constructor", {
    get() { throw "broken constructor"; }
  });

  let rejectedReason = undefined;
  g.return(bp).catch(e => {
    rejectedReason = e;
  });
  drainJobQueue();
  assertEq(rejectedReason, "broken constructor");
}

{
  async function* gen() {
    await undefined;
    try {
      yield 1;
    } catch (e) {
      yield "caught:" + e;
    }
  }

  const g = gen();
  g.next();

  const bp = Promise.resolve();
  Object.defineProperty(bp, "constructor", {
    get() { throw "broken constructor"; }
  });

  let fulfilledValue = undefined;
  g.return(bp).then(v => {
    fulfilledValue = v.value;
  });
  drainJobQueue();
  assertEq(fulfilledValue, "caught:broken constructor");
}

if (typeof reportCompare === "function")
  reportCompare(0, 0);
