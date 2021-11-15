const { SharedDataMap } = ChromeUtils.import(
  "resource://messaging-system/lib/SharedDataMap.jsm"
);
const { FileTestUtils } = ChromeUtils.import(
  "resource://testing-common/FileTestUtils.jsm"
);
const { TestUtils } = ChromeUtils.import(
  "resource://testing-common/TestUtils.jsm"
);
const { ExperimentFakes } = ChromeUtils.import(
  "resource://testing-common/MSTestUtils.jsm"
);

const PATH = FileTestUtils.getTempFile("shared-data-map").path;

function with_sharedDataMap(test) {
  let testTask = async () => {
    const sandbox = sinon.createSandbox();
    const instance = new SharedDataMap("xpcshell", {
      path: PATH,
      isParent: true,
    });
    try {
      await test({ instance, sandbox });
    } finally {
      sandbox.restore();
    }
  };

  // Copy the name of the test function to identify the test
  Object.defineProperty(testTask, "name", { value: test.name });
  add_task(testTask);
}

with_sharedDataMap(function test_sync({ instance, sandbox }) {
  instance.init(true);

  instance.set("foo", "bar");

  Assert.equal(instance.get("foo"), "bar", "It should retrieve a string value");
});

with_sharedDataMap(function test_set_notify({ instance, sandbox }) {
  instance.init(true);
  let updateStub = sandbox.stub();

  instance.on("parent-store-update:foo", updateStub);
  instance.set("foo", "bar");

  Assert.equal(updateStub.callCount, 1, "Update event sent");
  Assert.equal(updateStub.firstCall.args[1], "bar", "Update event sent value");
});

with_sharedDataMap(async function test_set_child_notify({ instance, sandbox }) {
  instance.init(true);

  let updateStub = sandbox.stub();
  const childInstance = new SharedDataMap("xpcshell", {
    path: PATH,
    isParent: false,
  });

  childInstance.on("child-store-update:foo", updateStub);
  let childStoreUpdate = new Promise(resolve =>
    childInstance.on("child-store-update:foo", resolve)
  );
  instance.set("foo", "bar");

  await childStoreUpdate;

  Assert.equal(updateStub.callCount, 1, "Update event sent");
  Assert.equal(updateStub.firstCall.args[1], "bar", "Update event sent value");
});

with_sharedDataMap(async function test_async({ instance, sandbox }) {
  const spy = sandbox.spy(instance._store, "load");
  await instance.init();

  instance.set("foo", "bar");

  Assert.equal(spy.callCount, 1, "Should init async");
  Assert.equal(instance.get("foo"), "bar", "It should retrieve a string value");
});

with_sharedDataMap(function test_saveSoon({ instance, sandbox }) {
  instance.init(true);
  const stub = sandbox.stub(instance._store, "saveSoon");

  instance.set("foo", "bar");

  Assert.equal(stub.callCount, 1, "Should call save soon when setting a value");
});

with_sharedDataMap(async function test_childInit({ instance, sandbox }) {
  sandbox.stub(instance, "isParent").get(() => false);
  const stubA = sandbox.stub(instance._store, "ensureDataReady");
  const stubB = sandbox.stub(instance._store, "load");

  await instance.init(true);

  Assert.equal(
    stubA.callCount,
    0,
    "It should not try to initialize sync from child"
  );
  Assert.equal(
    stubB.callCount,
    0,
    "It should not try to initialize async from child"
  );
});

with_sharedDataMap(async function test_parentChildSync_synchronously({
  instance: parentInstance,
  sandbox,
}) {
  parentInstance.init(true);
  parentInstance.set("foo", { bar: 1 });

  const childInstance = new SharedDataMap("xpcshell", {
    path: PATH,
    isParent: false,
  });

  await parentInstance.ready();
  await childInstance.ready();

  await TestUtils.waitForCondition(
    () => childInstance.get("foo"),
    "Wait for child to sync"
  );

  Assert.deepEqual(
    childInstance.get("foo"),
    parentInstance.get("foo"),
    "Parent and child should be in sync"
  );
});

with_sharedDataMap(async function test_parentChildSync_async({
  instance: parentInstance,
  sandbox,
}) {
  const childInstance = new SharedDataMap("xpcshell", {
    path: PATH,
    isParent: false,
  });

  await parentInstance.init();
  parentInstance.set("foo", { bar: 1 });

  await parentInstance.ready();
  await childInstance.ready();

  await TestUtils.waitForCondition(
    () => childInstance.get("foo"),
    "Wait for child to sync"
  );

  Assert.deepEqual(
    childInstance.get("foo"),
    parentInstance.get("foo"),
    "Parent and child should be in sync"
  );
});

with_sharedDataMap(async function test_earlyChildSync({
  instance: parentInstance,
  sandbox,
}) {
  const childInstance = new SharedDataMap("xpcshell", {
    path: PATH,
    isParent: false,
  });

  Assert.equal(childInstance.has("baz"), false, "Should not fail");

  parentInstance.init(true);
  parentInstance.set("baz", { bar: 1 });

  await TestUtils.waitForCondition(
    () => childInstance.get("baz"),
    "Wait for child to sync"
  );

  Assert.deepEqual(
    childInstance.get("baz"),
    parentInstance.get("baz"),
    "Parent and child should be in sync"
  );
});
