/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/** @import { MozOption } from '../../../../toolkit/content/widgets/moz-select/moz-select.mjs';*/

const { HandlerServiceTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/HandlerServiceTestUtils.sys.mjs"
);

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

async function getPdfCategoryItem() {
  let appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");
  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });
  info("Preferences page opened on the downloads pane.");
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;
  let container = win.document.getElementById("applicationsHandlersView");
  await container.updateComplete;

  let pdfCategory = container.querySelector(
    "moz-box-item[type='application/pdf']"
  );

  return pdfCategory;
}

/**
 * Selects provided actions menu dropdown item
 * and sets it as the actions menu value.
 *
 * @param {MozOption} item
 * @returns {Promise<void>}
 */
async function selectItemInPopup(item) {
  let list = item.closest(".actionsMenu");

  list.value = item.value;
  /**
   * Must trigger change manually to replicate
   * what the component does after selecting an option.
   */
  list.dispatchEvent(new CustomEvent("change"));

  await list.updateComplete;
  return item;
}

function downloadHadFinished(publicList) {
  return new Promise(resolve => {
    publicList.addView({
      onDownloadChanged(download) {
        if (download.succeeded || download.error) {
          publicList.removeView(this);
          resolve(download);
        }
      },
    });
  });
}

async function removeTheFile(download) {
  Assert.ok(
    await IOUtils.exists(download.target.path),
    "The file should have been downloaded."
  );

  try {
    info("removing " + download.target.path);
    if (Services.appinfo.OS === "WINNT") {
      // We need to make the file writable to delete it on Windows.
      await IOUtils.setPermissions(download.target.path, 0o600);
    }
    await IOUtils.remove(download.target.path);
  } catch (ex) {
    info("The file " + download.target.path + " is not removed, " + ex);
  }
}

add_task(async function alwaysAskPreferenceWorks() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.always_ask_before_handling_new_types", false],
      ["browser.download.useDownloadDir", true],
    ],
  });

  let pdfCategory = await getPdfCategoryItem();
  let list = pdfCategory.querySelector(".actionsMenu");

  let alwaysAskItem = list.querySelector(
    `moz-option[action='${Ci.nsIHandlerInfo.alwaysAsk}']`
  );
  await selectItemInPopup(alwaysAskItem);
  Assert.equal(
    list.value,
    Ci.nsIHandlerInfo.alwaysAsk + "",
    "Should have selected 'always ask' for pdf"
  );
  let alwaysAskBeforeHandling = HandlerServiceTestUtils.getHandlerInfo(
    pdfCategory.getAttribute("type")
  ).alwaysAskBeforeHandling;
  Assert.ok(
    alwaysAskBeforeHandling,
    "Should have turned on 'always asking before handling'"
  );

  let domWindowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
  let loadingTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "empty_pdf_file.pdf",
    waitForLoad: false,
    waitForStateStop: true,
  });

  let domWindow = await domWindowPromise;
  let dialog = domWindow.document.querySelector("#unknownContentType");
  let button = dialog.getButton("cancel");

  await TestUtils.waitForCondition(
    () => !button.disabled,
    "Wait for Cancel button to get enabled"
  );
  Assert.ok(dialog, "Dialog should be shown");
  dialog.cancelDialog();
  BrowserTestUtils.removeTab(loadingTab);

  gBrowser.removeCurrentTab();
});

add_task(async function handleInternallyPreferenceWorks() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.always_ask_before_handling_new_types", false],
      ["browser.download.useDownloadDir", true],
    ],
  });

  let pdfCategory = await getPdfCategoryItem();

  let list = pdfCategory.querySelector(".actionsMenu");

  let handleInternallyItem = list.querySelector(
    `moz-option[action='${Ci.nsIHandlerInfo.handleInternally}']`
  );

  await selectItemInPopup(handleInternallyItem);

  Assert.equal(
    list.value,
    handleInternallyItem.value,
    "Should have selected 'handle internally' for pdf"
  );

  let loadingTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "empty_pdf_file.pdf",
    waitForLoad: false,
    waitForStateStop: true,
  });

  await SpecialPowers.spawn(loadingTab.linkedBrowser, [], async () => {
    await ContentTaskUtils.waitForCondition(
      () => content.document.readyState == "complete"
    );
    Assert.ok(
      content.document.querySelector("div#viewer"),
      "document content has viewer UI"
    );
  });

  BrowserTestUtils.removeTab(loadingTab);

  gBrowser.removeCurrentTab();
});

add_task(async function saveToDiskPreferenceWorks() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.always_ask_before_handling_new_types", false],
      ["browser.download.useDownloadDir", true],
    ],
  });

  let pdfCategory = await getPdfCategoryItem();
  let list = pdfCategory.querySelector(".actionsMenu");

  let saveToDiskItem = list.querySelector(
    `moz-option[action='${Ci.nsIHandlerInfo.saveToDisk}']`
  );

  await selectItemInPopup(saveToDiskItem);
  Assert.equal(
    list.value,
    saveToDiskItem.value,
    "Should have selected 'save to disk' for pdf"
  );

  let publicList = await Downloads.getList(Downloads.PUBLIC);
  registerCleanupFunction(async () => {
    await publicList.removeFinished();
  });

  let downloadFinishedPromise = downloadHadFinished(publicList);

  let loadingTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "empty_pdf_file.pdf",
    waitForLoad: false,
    waitForStateStop: true,
  });

  let download = await downloadFinishedPromise;
  BrowserTestUtils.removeTab(loadingTab);

  await removeTheFile(download);

  gBrowser.removeCurrentTab();
});

add_task(async function useSystemDefaultPreferenceWorks() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.always_ask_before_handling_new_types", false],
      ["browser.download.useDownloadDir", true],
    ],
  });

  let pdfCategory = await getPdfCategoryItem();
  let list = pdfCategory.querySelector(".actionsMenu");

  let useSystemDefaultItem = list.querySelector(
    `moz-option[action='${Ci.nsIHandlerInfo.useSystemDefault}']`
  );

  // Whether there's a "use default" item depends on the OS, there might not be a system default viewer.
  if (!useSystemDefaultItem) {
    info(
      "No 'Use default' item, so no testing for setting 'use system default' preference"
    );
    gBrowser.removeCurrentTab();
    return;
  }

  await selectItemInPopup(useSystemDefaultItem);
  Assert.equal(
    list.value,
    useSystemDefaultItem.value,
    "Should have selected 'use system default' for pdf"
  );

  let oldLaunchFile = DownloadIntegration.launchFile;

  let waitForLaunchFileCalled = new Promise(resolve => {
    DownloadIntegration.launchFile = () => {
      ok(true, "The file should be launched with an external application");
      resolve();
    };
  });

  let publicList = await Downloads.getList(Downloads.PUBLIC);
  registerCleanupFunction(async () => {
    await publicList.removeFinished();
  });

  let downloadFinishedPromise = downloadHadFinished(publicList);

  let loadingTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_PATH + "empty_pdf_file.pdf",
    waitForLoad: false,
    waitForStateStop: true,
  });

  info("Downloading had finished");
  let download = await downloadFinishedPromise;

  info("Waiting until DownloadIntegration.launchFile is called");
  await waitForLaunchFileCalled;

  DownloadIntegration.launchFile = oldLaunchFile;

  await removeTheFile(download);

  BrowserTestUtils.removeTab(loadingTab);

  gBrowser.removeCurrentTab();
});
