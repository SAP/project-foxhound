/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const {
  createAsyncTestTraitInterface,
  createTestTraitInterface,
  invokeAsyncTestTraitInterfaceGetValue,
  invokeAsyncTestTraitInterfaceNoop,
  invokeAsyncTestTraitInterfaceSetValue,
  invokeAsyncTestTraitInterfaceThrowIfEqual,
  invokeTestTraitInterfaceNoop,
  invokeTestTraitInterfaceSetValue,
  roundtripAsyncTestTraitInterface,
  roundtripAsyncTestTraitInterfaceList,
  roundtripTestTraitInterface,
  roundtripTestTraitInterfaceList,
  Failure1,
  AsyncTestTraitInterface,
  CallbackInterfaceNumbers,
  TestTraitInterface,
} = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/uniffi-bindgen-gecko-js/tests/generated/RustUniffiBindingsTests.sys.mjs"
);

/**
 *
 */
class TraitImpl extends TestTraitInterface {
  constructor(value) {
    super();
    this.value = value;
  }

  noop() {
    return this.value;
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
  }

  throwIfEqual(numbers) {
    if (numbers.a === numbers.b) {
      throw new Failure1();
    } else {
      return numbers;
    }
  }
}

// Test calling sync trait interfaces from JS
function testSyncTraitInterfaceFromJs(int) {
  int.noop();
  Assert.equal(int.getValue(), 42);
  int.setValue(43);
  Assert.equal(int.getValue(), 43);
  Assert.throws(
    () =>
      int.throwIfEqual(
        new CallbackInterfaceNumbers({
          a: 10,
          b: 10,
        })
      ),
    Failure1
  );
  Assert.deepEqual(
    int.throwIfEqual(
      new CallbackInterfaceNumbers({
        a: 10,
        b: 11,
      })
    ),
    new CallbackInterfaceNumbers({
      a: 10,
      b: 11,
    })
  );
}

// Test calling sync JS interfaces from Rust
//
// We can't test that much, since sync callback interfaces are automatically wrapped to be
// fire-and-forget and can't return values
function testSyncTraitInterfaceFromRust(int) {
  // Arrange for `noop()` to be called, then wait a while and make sure nothing crashes.
  invokeTestTraitInterfaceNoop(int);
  do_test_pending();
  do_timeout(100, do_test_finished);

  // Arrange for `setValue` to be called and test that it happened
  invokeTestTraitInterfaceSetValue(int, 43);
  do_test_pending();
  do_timeout(100, () => {
    Assert.equal(int.getValue(), 43);
    do_test_finished();
  });
}

// Test various combinations of Rust and JS implemented trait interfaces
add_task(() => testSyncTraitInterfaceFromJs(createTestTraitInterface(42)));
add_task(() => testSyncTraitInterfaceFromRust(new TraitImpl(42)));
// Test passing async trait interfaces back and forth across the FFI
add_task(() =>
  testSyncTraitInterfaceFromJs(
    roundtripTestTraitInterface(createTestTraitInterface(42))
  )
);
add_task(() =>
  testSyncTraitInterfaceFromRust(roundtripTestTraitInterface(new TraitImpl(42)))
);
// This time, pass them across the FFI using a RustBuffer, which goes through a slightly different
// codepath
add_task(() =>
  testSyncTraitInterfaceFromJs(
    roundtripTestTraitInterfaceList([createTestTraitInterface(42)])[0]
  )
);
add_task(() =>
  testSyncTraitInterfaceFromRust(
    roundtripTestTraitInterfaceList([new TraitImpl(42)])[0]
  )
);

/**
 *
 */
class AsyncTraitImpl extends AsyncTestTraitInterface {
  constructor(value) {
    super();
    this.value = value;
  }

  async noop() {
    return this.value;
  }

  async getValue() {
    return this.value;
  }

  async setValue(value) {
    console.log("set value", value);
    this.value = value;
  }

  async throwIfEqual(numbers) {
    if (numbers.a === numbers.b) {
      throw new Failure1();
    } else {
      return numbers;
    }
  }
}

// Test calling the async Rust impl from JS
async function testAsyncTraitInterfaceFromJs(int) {
  await int.noop();
  Assert.equal(await int.getValue(), 42);
  await int.setValue(43);
  Assert.equal(await int.getValue(), 43);
  await Assert.rejects(
    int.throwIfEqual(
      new CallbackInterfaceNumbers({
        a: 10,
        b: 10,
      })
    ),
    Failure1
  );
  Assert.deepEqual(
    await int.throwIfEqual(
      new CallbackInterfaceNumbers({
        a: 10,
        b: 11,
      })
    ),
    new CallbackInterfaceNumbers({
      a: 10,
      b: 11,
    })
  );
}

// Test calling async JS interfaces from Rust
async function testAsyncTraitInterfaceFromRust(int) {
  await invokeAsyncTestTraitInterfaceNoop(int);
  Assert.equal(await invokeAsyncTestTraitInterfaceGetValue(int), 42);
  await invokeAsyncTestTraitInterfaceSetValue(int, 43);
  Assert.equal(await invokeAsyncTestTraitInterfaceGetValue(int), 43);
  await Assert.rejects(
    invokeAsyncTestTraitInterfaceThrowIfEqual(
      int,
      new CallbackInterfaceNumbers({
        a: 10,
        b: 10,
      })
    ),
    Failure1
  );
  Assert.deepEqual(
    await invokeAsyncTestTraitInterfaceThrowIfEqual(
      int,
      new CallbackInterfaceNumbers({
        a: 10,
        b: 11,
      })
    ),
    new CallbackInterfaceNumbers({
      a: 10,
      b: 11,
    })
  );
}

add_task(async () =>
  testAsyncTraitInterfaceFromJs(await createAsyncTestTraitInterface(42))
);
add_task(async () => testAsyncTraitInterfaceFromRust(new AsyncTraitImpl(42)));
// Test passing async trait interfaces back and forth across the FFI
add_task(async () =>
  testAsyncTraitInterfaceFromJs(
    roundtripAsyncTestTraitInterface(await createAsyncTestTraitInterface(42))
  )
);
add_task(async () =>
  testAsyncTraitInterfaceFromRust(
    roundtripAsyncTestTraitInterface(new AsyncTraitImpl(42))
  )
);
// This time, pass them across the FFI using a RustBuffer, which goes through a slightly different
// codepath
add_task(async () =>
  testAsyncTraitInterfaceFromJs(
    roundtripAsyncTestTraitInterfaceList([
      await createAsyncTestTraitInterface(42),
    ])[0]
  )
);
add_task(async () =>
  testAsyncTraitInterfaceFromRust(
    roundtripAsyncTestTraitInterfaceList([new AsyncTraitImpl(42)])[0]
  )
);
