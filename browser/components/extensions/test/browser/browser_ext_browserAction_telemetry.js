"use strict";

const EXTENSION_ID1 = "@test-extension1";
const EXTENSION_ID2 = "@test-extension2";

// Keep this in sync with the order in browser_action_preload_result
// defined in toolkit/components/extensions/metrics.yaml.
const GLEAN_RESULT_LABELS = [
  "popupShown",
  "clearAfterHover",
  "clearAfterMousedown",
  "__other__",
];

function assertGleanPreloadResultLabelCounter(expectedLabelsValue) {
  for (const label of GLEAN_RESULT_LABELS) {
    const expectedLabelValue = expectedLabelsValue[label];
    Assert.deepEqual(
      Glean.extensionsCounters.browserActionPreloadResult[label].testGetValue(),
      expectedLabelValue,
      `Expect Glean browserActionPreloadResult metric label ${label} to be ${
        expectedLabelValue > 0 ? expectedLabelValue : "empty"
      }`
    );
  }
}

add_task(async function testBrowserActionTelemetryTiming() {
  let extensionOptions = {
    manifest: {
      browser_action: {
        default_popup: "popup.html",
        default_area: "navbar",
        browser_style: true,
      },
    },

    files: {
      "popup.html": `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div></div></body></html>`,
    },
  };
  let extension1 = ExtensionTestUtils.loadExtension({
    ...extensionOptions,
    manifest: {
      ...extensionOptions.manifest,
      browser_specific_settings: {
        gecko: { id: EXTENSION_ID1 },
      },
    },
  });
  let extension2 = ExtensionTestUtils.loadExtension({
    ...extensionOptions,
    manifest: {
      ...extensionOptions.manifest,
      browser_specific_settings: {
        gecko: { id: EXTENSION_ID2 },
      },
    },
  });

  Services.fog.testResetFOG();

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue(),
    undefined,
    "No data recorded for glean metric extensionsTiming.browserActionPopupOpen"
  );
  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue(),
    {},
    "No data recorded for glean metric extensionsTiming.browserActionPopupOpenByAddonid"
  );

  await extension1.startup();
  await extension2.startup();

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue(),
    undefined,
    "No data recorded for glean metric extensionsTiming.browserActionPopupOpen"
  );
  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue(),
    {},
    "No data recorded for glean metric extensionsTiming.browserActionPopupOpenByAddonid"
  );

  info("Open extension1 browserAction popup");

  clickBrowserAction(extension1);
  await awaitExtensionPanel(extension1);

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.count,
    1,
    "Got the expected number of samples in browserActionPopupOpen Glean metric"
  );

  const allAddonsTimingSum =
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.sum;
  const ext1TimingSum =
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum;
  Assert.greater(
    allAddonsTimingSum,
    0,
    "Expect browserActionPopupOpen metric data to be found"
  );
  Assert.greater(
    ext1TimingSum,
    0,
    "Expect browserActionPopupOpenByAddonid metric data for extension1 to be found"
  );

  await closeBrowserAction(extension1);

  info("Open extension2 browserAction popup");

  clickBrowserAction(extension2);
  await awaitExtensionPanel(extension2);

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.count,
    2,
    "Got the expected number of samples in browserActionPopupOpen Glean metric"
  );
  Assert.greater(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.sum,
    allAddonsTimingSum,
    "Expect browserActionPopupOpen metric data to increase after extension2 action panel open"
  );
  const ext2TimingSum =
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum;
  Assert.greater(
    ext2TimingSum,
    0,
    "Expect browserActionPopupOpenByAddonid metric data for extension2 to be found"
  );
  Assert.equal(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1TimingSum,
    "Expect browserActionPopupOpenByAddonid metric data for extension1 to not change"
  );

  await closeBrowserAction(extension2);

  info("Open extension1 browserAction popup again");

  clickBrowserAction(extension2);
  await awaitExtensionPanel(extension2);

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.count,
    3,
    "Got the expected number of samples in browserActionPopupOpen Glean metric"
  );
  const ext2TimingSumMeasure2 =
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum;
  Assert.greater(
    ext2TimingSumMeasure2,
    ext2TimingSum,
    "Expect browserActionPopupOpenByAddonid metric data for extension2 to increase"
  );
  Assert.equal(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1TimingSum,
    "Expect browserActionPopupOpenByAddonid metric data for extension1 to not change"
  );

  await closeBrowserAction(extension2);

  info("Open extension1 browserAction popup again");

  clickBrowserAction(extension1);
  await awaitExtensionPanel(extension1);

  Assert.deepEqual(
    Glean.extensionsTiming.browserActionPopupOpen.testGetValue()?.count,
    4,
    "Got the expected number of samples in browserActionPopupOpen Glean metric"
  );
  Assert.greater(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1TimingSum,
    "Expect browserActionPopupOpenByAddonid metric data for extension1 to increase"
  );
  Assert.equal(
    Glean.extensionsTiming.browserActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum,
    ext2TimingSumMeasure2,
    "Expect pageActionPopupOpenByAddonid metric data for extension2 to not change"
  );

  await closeBrowserAction(extension1);

  await extension1.unload();
  await extension2.unload();
});

add_task(async function testBrowserActionTelemetryResults() {
  let extensionOptions = {
    manifest: {
      browser_specific_settings: {
        gecko: { id: EXTENSION_ID1 },
      },
      browser_action: {
        default_popup: "popup.html",
        default_area: "navbar",
        browser_style: true,
      },
    },

    files: {
      "popup.html": `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div></div></body></html>`,
    },
  };
  let extension = ExtensionTestUtils.loadExtension(extensionOptions);

  Services.fog.testResetFOG();

  Assert.deepEqual(
    Glean.extensionsCounters.browserActionPreloadResult.testGetValue(),
    {},
    "No data recorded for glean metric extensionsTiming.browserActionPreloadResult"
  );

  // TODO: simplify assertion verifying that there isn't any data in the
  // browserActionPreloadResultByAddonid GleanDoubleLabeled metric
  // (currently blocked on Bug 2026013).
  for (const category of GLEAN_RESULT_LABELS) {
    const metric =
      Glean.extensionsCounters.browserActionPreloadResultByAddonid.get(
        EXTENSION_ID1,
        category
      );
    Assert.equal(
      metric.testGetValue(),
      null,
      `No browserActionPreloadResultByAddonid metric data for extension1 and category ${category}`
    );
  }

  await extension.startup();

  // Make sure the mouse isn't hovering over the browserAction widget to start.
  EventUtils.synthesizeMouseAtCenter(gURLBar, { type: "mouseover" }, window);

  let widget = getBrowserActionWidget(extension).forWindow(window);

  // Hover the mouse over the browserAction widget and then move it away.
  EventUtils.synthesizeMouseAtCenter(
    widget.node,
    { type: "mouseover", button: 0 },
    window
  );
  EventUtils.synthesizeMouseAtCenter(
    widget.node,
    { type: "mouseout", button: 0 },
    window
  );
  EventUtils.synthesizeMouseAtCenter(
    document.documentElement,
    { type: "mousemove" },
    window
  );

  assertGleanPreloadResultLabelCounter({ clearAfterHover: 1 });
  Assert.equal(
    Glean.extensionsCounters.browserActionPreloadResultByAddonid
      .get(EXTENSION_ID1, "clearAfterHover")
      .testGetValue(),
    1,
    "Expect browserActionPreloadResultByAddonid metric data for extension1 and clearAfterHover label"
  );

  Services.fog.testResetFOG();

  // TODO: Create a test for cancel after mousedown.
  // This is tricky because calling mouseout after mousedown causes a
  // "Hover" event to be added to the queue in ext-browserAction.js.

  clickBrowserAction(extension);
  await awaitExtensionPanel(extension);

  assertGleanPreloadResultLabelCounter({ popupShown: 1 });
  Assert.equal(
    Glean.extensionsCounters.browserActionPreloadResultByAddonid
      .get(EXTENSION_ID1, "popupShown")
      .testGetValue(),
    1,
    "Expect browserActionPreloadResultByAddonid metric data for extension1 and popupShown label"
  );

  await closeBrowserAction(extension);

  await extension.unload();
});
