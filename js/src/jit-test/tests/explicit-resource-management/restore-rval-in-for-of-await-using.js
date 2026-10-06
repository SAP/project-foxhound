// |jit-test| skip-if: !getBuildConfiguration("explicit-resource-management"); --enable-explicit-resource-management

load(libdir + "asserts.js");

async function testAwaitUsingPreservesRval() {
  for (await using x of [
    {
      [Symbol.asyncDispose]() {
        return Promise.resolve();
      },
    },
  ]) {
    return 42;
  }
}

testAwaitUsingPreservesRval().then(v => assertEq(v, 42));
drainJobQueue();
