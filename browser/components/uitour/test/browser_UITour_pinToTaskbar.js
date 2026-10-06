"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

var gTestTab;
var gContentAPI;

add_task(setup_UITourTest);

add_UITour_task(
  async function test_appinfo_needsPin_false_when_already_pinned() {
    const sandbox = sinon.createSandbox();
    sandbox.stub(ShellService, "doesAppNeedPin").resolves(false);
    let data = await getConfigurationPromise("appinfo");
    is(
      data.needsPin,
      false,
      "appinfo.needsPin should be false when already pinned"
    );
    sandbox.restore();
  }
);

add_UITour_task(async function test_appinfo_needsPin_true_when_unpinned() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(ShellService, "doesAppNeedPin").resolves(true);
  let data = await getConfigurationPromise("appinfo");
  is(
    data.needsPin,
    true,
    "appinfo.needsPin should be true when not yet pinned"
  );
  sandbox.restore();
});

add_UITour_task(async function test_pinToTaskbar_calls_shell_service() {
  const sandbox = sinon.createSandbox();
  const stub = sandbox.stub(ShellService, "pinToTaskbar").resolves();
  await gContentAPI.pinToTaskbar();
  await TestUtils.waitForCondition(() => stub.called, "pinToTaskbar called");
  ok(
    stub.called,
    "ShellService.pinToTaskbar() was called by the UITour action"
  );
  sandbox.restore();
});
