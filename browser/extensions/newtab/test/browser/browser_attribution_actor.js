/* Public Domain — http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  NewTabActorRegistry: "resource://newtab/lib/NewTabActorRegistry.sys.mjs",
  newTabAttributionService:
    "resource://newtab/lib/NewTabAttributionService.sys.mjs",
  NewTabAttributionServiceClass:
    "resource://newtab/lib/NewTabAttributionService.sys.mjs",
});

const { AttributionParent } = ChromeUtils.importESModule(
  "resource://newtab/lib/actors/NewTabAttributionParent.sys.mjs"
);

const { RemoteSettings } = ChromeUtils.importESModule(
  "resource://services-settings/remote-settings.sys.mjs"
);

const { DAPSender } = ChromeUtils.importESModule(
  "resource://gre/modules/DAPSender.sys.mjs"
);

let sandbox;
let dapStub;
let conversionStub;

async function resetDatabase() {
  await newTabAttributionService.onAttributionReset();
}

async function viewImpression({ partnerId, allocation }) {
  await newTabAttributionService.onAttributionEvent("view", {
    partner_id: partnerId,
    conversion: {
      task_id: allocation.task_id,
      vdaf: allocation.vdaf,
      bits: allocation.bits,
      length: allocation.length,
      time_precision: allocation.time_precision,
      default_measurement: allocation.default_measurement,
      index: allocation.index,
    },
  });
}

const TEST_URL = "https://example.com/";

async function getParentActor(browser) {
  return browser.browsingContext.currentWindowGlobal.getActor("Attribution");
}

/**
 * Helper to dispatch a FirefoxConversionNotification event in the content process.
 *
 * @param {Browser} browser - The browser element
 * @param {object} detail - The detail object to pass to the event
 */
async function dispatchAttributionEvent(browser, detail) {
  await SpecialPowers.spawn(browser, [detail], function (contentDetail) {
    let event = new content.CustomEvent("FirefoxConversionNotification", {
      detail: contentDetail,
      bubbles: true,
    });
    content.dispatchEvent(event);
  });
}

add_setup(async function () {
  // enable gating so registry will register the actor
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "browser.newtabpage.activity-stream.discoverystream.attribution.enabled",
        true,
      ],
      ["browser.newtabpage.activity-stream.feeds.topsites", true],
      ["browser.newtabpage.activity-stream.feeds.system.topsites", true],
      ["browser.newtabpage.activity-stream.showSponsoredTopSites", true],
      ["browser.newtabpage.activity-stream.unifiedAds.tiles.enabled", true],
      ["browser.newtab.preload", false],
      ["browser.newtabpage.activity-stream.prerender", false],
    ],
  });

  sandbox = sinon.createSandbox();

  dapStub = sandbox.stub(DAPSender, "sendDAPMeasurement");
  conversionStub = sandbox.stub(
    NewTabAttributionServiceClass.prototype,
    "onAttributionConversion"
  );

  registerCleanupFunction(async () => {
    await resetDatabase();
    sandbox.restore();
    await SpecialPowers.popPrefEnv();
  });
});

/**
 * Helper to reset the allowlist before each test.
 */
async function setAllowList(allowList = []) {
  // Open a temporary tab to get an actor and reset the allowlist
  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    parent.setAllowListForTest(allowList);
  });
}

/**
 * Reset test state before each test.
 */
async function resetTestState() {
  await resetDatabase();
  await setAllowList();
  if (conversionStub) {
    conversionStub.resetHistory();
  }
}

/**
 * Test that onAttributionConversion is called with a valid payload
 * from an allowlisted origin.
 */
add_task(async function test_parent_calls_onAttributionConversion() {
  await resetTestState();
  dapStub.resetHistory();

  const partnerId = "expedia";
  const lookbackDays = 7;
  const impressionType = "view";

  const allocation = {
    task_id: "task-123",
    vdaf: "sum",
    bits: 8,
    length: 4,
    time_precision: 1,
    default_measurement: 0,
    index: 2,
  };

  await viewImpression({ partnerId, allocation });

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    const origin = parent.manager.documentPrincipal.originNoSuffix;
    parent.setAllowListForTest([origin]);

    await dispatchAttributionEvent(browser, {
      partnerId,
      lookbackDays,
      impressionType,
    });

    Assert.ok(
      conversionStub.calledOnce,
      "onAttributionConversion was called once"
    );
    Assert.ok(
      conversionStub.calledWith(partnerId, lookbackDays, impressionType),
      "onAttributionConversion was called with correct arguments"
    );
  });
});

/**
 * Test that onAttributionConversion is NOT called when origin
 * is not in allowlist.
 */
add_task(async function test_parent_blocks_non_allowlisted_origin() {
  await resetTestState();

  const partnerId = "expedia";
  const lookbackDays = 7;
  const impressionType = "view";

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    await dispatchAttributionEvent(browser, {
      partnerId,
      lookbackDays,
      impressionType,
    });
    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");
  });
});

/**
 * Test that onAttributionConversion is NOT called with invalid
 * conversion data (extra keys).
 */
add_task(async function test_parent_blocks_invalid_conversion_extra_keys() {
  await resetTestState();

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    const origin = parent.manager.documentPrincipal.originNoSuffix;
    parent.setAllowListForTest([origin]);

    await dispatchAttributionEvent(browser, {
      partnerId: "expedia",
      lookbackDays: 7,
      impressionType: "view",
      extraKey: "should-be-rejected", // Invalid extra key
    });

    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");
  });
});

/**
 * Test that onAttributionConversion is NOT called when conversion
 * is not an object.
 */
add_task(async function test_parent_blocks_non_object_conversion() {
  await resetTestState();

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    const origin = parent.manager.documentPrincipal.originNoSuffix;
    parent.setAllowListForTest([origin]);

    // Test with string
    await dispatchAttributionEvent(browser, "not-an-object");

    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");

    // Test with array
    await dispatchAttributionEvent(browser, ["array"]);

    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");
  });
});

/**
 * Test that onAttributionConversion is NOT called when
 * message.data.detail is missing.
 */
add_task(async function test_parent_blocks_missing_detail() {
  await resetTestState();

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    const origin = parent.manager.documentPrincipal.originNoSuffix;
    parent.setAllowListForTest([origin]);

    // Test with undefined detail
    await dispatchAttributionEvent(browser, undefined);

    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");

    // Test with empty detail object
    await dispatchAttributionEvent(browser, {});

    Assert.ok(!conversionStub.called, "onAttributionConversion was not called");
  });
});

/**
 * Test that Remote Settings client uses get() and registers onSync handler.
 */
add_task(async function test_remote_settings_sync_and_handler() {
  await resetTestState();

  const mockClient = {
    get: sandbox
      .stub()
      .resolves([
        { domain: "https://example.com" },
        { domain: "https://partner.com" },
      ]),
    on: sandbox.stub(),
    off: sandbox.stub(),
  };

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    parent.resetRemoteSettingsClientForTest();
    sandbox.stub(parent, "RemoteSettings").returns(mockClient);

    await parent.retrieveAllowList();

    Assert.ok(mockClient.get.calledOnce, "get() was called once");
    Assert.ok(mockClient.on.calledOnce, "on() was called once");
    Assert.equal(
      mockClient.on.firstCall.args[0],
      "sync",
      "on() was called with 'sync' event"
    );
  });
});

/**
 * Test that onSync updates the allowlist when Remote Settings syncs.
 */
add_task(async function test_onSync_updates_allowlist() {
  await resetTestState();

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    const testOrigin = "https://test-partner.com";

    parent.setAllowListForTest([]);

    parent.onSync({
      data: {
        current: [{ domain: "https://example.com" }, { domain: testOrigin }],
      },
    });

    const origin = parent.manager.documentPrincipal.originNoSuffix;
    parent.setAllowListForTest([origin]);

    await dispatchAttributionEvent(browser, {
      partnerId: "test-partner",
      lookbackDays: 7,
      impressionType: "view",
    });

    await BrowserTestUtils.waitForCondition(() => conversionStub.calledOnce);
    Assert.ok(
      conversionStub.calledOnce,
      "onAttributionConversion was called after onSync updated allowlist"
    );
  });
});

/**
 * Test that didDestroy removes the onSync event listener.
 */
add_task(async function test_didDestroy_removes_listener() {
  await resetTestState();

  const mockClient = {
    get: sandbox.stub().resolves([]),
    on: sandbox.stub(),
    off: sandbox.stub(),
  };

  await BrowserTestUtils.withNewTab(TEST_URL, async browser => {
    const parent = await getParentActor(browser);
    parent.resetRemoteSettingsClientForTest();
    sandbox.stub(parent, "RemoteSettings").returns(mockClient);

    await parent.retrieveAllowList();

    parent.didDestroy();

    Assert.ok(mockClient.off.calledOnce, "off() was called once");
    Assert.equal(
      mockClient.off.firstCall.args[0],
      "sync",
      "off() was called with 'sync' event"
    );
  });
});
