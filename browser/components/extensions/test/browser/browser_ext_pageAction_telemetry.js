"use strict";

const EXTENSION_ID1 = "@test-extension1";
const EXTENSION_ID2 = "@test-extension2";

add_task(async function testPageActionTelemetry() {
  let extensionOptions = {
    manifest: {
      page_action: {
        default_popup: "popup.html",
        browser_style: true,
      },
    },
    background: function () {
      browser.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs[0].id;

        browser.pageAction.show(tabId).then(() => {
          browser.test.sendMessage("action-shown");
        });
      });
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
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue(),
    undefined,
    "No data recorded for glean metric extensionsTiming.pageActionPopupOpen"
  );
  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue(),
    {},
    "No data recorded for glean metric extensionsTiming.pageActionPopupOpenByAddonid"
  );

  await extension1.startup();
  await extension1.awaitMessage("action-shown");
  await extension2.startup();
  await extension2.awaitMessage("action-shown");

  // No data is expected after the two test extension has been started
  // but none of the pageAction popup was opened yet.
  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue(),
    undefined,
    "No data recorded for glean metric extensionsTiming.pageActionPopupOpen"
  );
  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue(),
    {},
    "No data recorded for glean metric extensionsTiming.pageActionPopupOpenByAddonid"
  );

  info("Open extension1 pageAction popup");

  clickPageAction(extension1, window);
  await awaitExtensionPanel(extension1);

  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.count,
    1,
    "Got the expected number of samples in pageActionPopupOpen Glean metric"
  );

  const allAddonsMetricSum =
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.sum;
  const ext1MetricSum =
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum;
  Assert.greater(
    allAddonsMetricSum,
    0,
    "Expect pageActionPopupOpen metric data to be found"
  );
  Assert.greater(
    ext1MetricSum,
    0,
    "Expect pageActionPopupOpenByAddonid metric data for extension1 to be found"
  );

  await closePageAction(extension1, window);

  info("Open extension2 pageAction popup");

  clickPageAction(extension2, window);
  await awaitExtensionPanel(extension2);

  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.count,
    2,
    "Got the expected number of samples in pageActionPopupOpen Glean metric"
  );
  Assert.greater(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.sum,
    allAddonsMetricSum,
    "Expect pageActionPopupOpen metric data to increase after extension2 action panel open"
  );
  const ext2MetricSum =
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum;
  Assert.greater(
    ext2MetricSum,
    0,
    "Expect pageActionPopupOpenByAddonid metric data for extension2 to be found"
  );
  Assert.equal(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1MetricSum,
    "Expect pageActionPopupOpenByAddonid metric data for extension1 to not change"
  );

  await closePageAction(extension2, window);

  info("Open extension2 pageAction popup again");

  clickPageAction(extension2, window);
  await awaitExtensionPanel(extension2);

  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.count,
    3,
    "Got the expected number of samples in pageActionPopupOpen Glean metric"
  );
  const ext2MetricSumMeasure2 =
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum;
  Assert.greater(
    ext2MetricSumMeasure2,
    ext2MetricSum,
    "Expect pageActionPopupOpenByAddonid metric data for extension2 to increase"
  );
  Assert.equal(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1MetricSum,
    "Expect pageActionPopupOpenByAddonid metric data for extension1 to not change"
  );

  await closePageAction(extension2, window);

  info("Open extension1 pageAction popup again");

  clickPageAction(extension1, window);
  await awaitExtensionPanel(extension1);

  Assert.deepEqual(
    Glean.extensionsTiming.pageActionPopupOpen.testGetValue()?.count,
    4,
    "Got the expected number of samples in pageActionPopupOpen Glean metric"
  );
  Assert.greater(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension1.id
    ]?.sum,
    ext1MetricSum,
    "Expect pageActionPopupOpenByAddonid metric data for extension1 to increase"
  );
  Assert.equal(
    Glean.extensionsTiming.pageActionPopupOpenByAddonid.testGetValue()?.[
      extension2.id
    ]?.sum,
    ext2MetricSumMeasure2,
    "Expect pageActionPopupOpenByAddonid metric data for extension2 to not change"
  );

  await closePageAction(extension1, window);

  await extension1.unload();
  await extension2.unload();
});
