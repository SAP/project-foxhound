// |jit-test| skip-if: !getBuildConfiguration("explicit-resource-management")

load(libdir + "asserts.js");

{
  const values = [];
  const errorsToThrow = [new Error("test1"), new Error("test2")];
  async function* gen() {
    using d = {
      value: "d",
      [Symbol.dispose]() {
        values.push(this.value);
      }
    }
    yield await Promise.resolve("a");
    yield await Promise.resolve("b");
    using c = {
      value: "c",
      [Symbol.dispose]() {
        values.push(this.value);
        throw errorsToThrow[0]; // This error will suppress the error thrown below.
      }
    }
    throw errorsToThrow[1]; // This error will be suppressed during disposal.
  }

  async function testDisposeWithThrowAndPendingException() {
    let x = gen();
    values.push((await x.next()).value);
    values.push((await x.next()).value);
    await x.next();
  }
  let e = null;
  testDisposeWithThrowAndPendingException().catch((err) => { e = err; });
  drainJobQueue();
  assertSuppressionChain(() => { throw e; }, errorsToThrow);
  assertArrayEq(values, ["a", "b", "c", "d"]);
}

{
  const values = [];
  const errorsToThrow = [new Error("test1"), new Error("test2")];
  async function* gen() {
    using c = {
      value: "c",
      [Symbol.dispose]() {
        values.push(this.value);
        throw errorsToThrow[0];
      }
    }
    yield await Promise.resolve("a");
    yield await Promise.resolve("b");
    return;
  }
  async function testDisposeWithThrowAndForcedThrowInAsyncGenerator() {
    let x = gen();
    values.push((await x.next()).value);
    await x.throw(errorsToThrow[1]);
  }
  let e = null;
  testDisposeWithThrowAndForcedThrowInAsyncGenerator().catch((err) => { e = err; });
  drainJobQueue();
  assertSuppressionChain(() => { throw e; }, errorsToThrow);
  assertArrayEq(values, ["a", "c"]);
}
