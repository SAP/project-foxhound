/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { HandlerServiceTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/HandlerServiceTestUtils.sys.mjs"
);

let gHandlerService = Cc["@mozilla.org/uriloader/handler-service;1"].getService(
  Ci.nsIHandlerService
);

let gOriginalPreferredPDFHandler;

registerCleanupFunction(function () {
  let pdfHandlerInfo =
    HandlerServiceTestUtils.getHandlerInfo("application/pdf");
  pdfHandlerInfo.preferredApplicationHandler = gOriginalPreferredPDFHandler;
  gHandlerService.store(pdfHandlerInfo);

  gBrowser.removeCurrentTab();
});

add_setup(async function () {
  let pdfHandlerInfo =
    HandlerServiceTestUtils.getHandlerInfo("application/pdf");
  gOriginalPreferredPDFHandler = pdfHandlerInfo.preferredApplicationHandler;
  gHandlerService.store(pdfHandlerInfo);
});

add_task(async function testApplicationsLoadInSearchResults() {
  // Start on a pane other than "Downloads" to ensure that the application
  // handlers haven't been loaded already
  await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });

  let win = gBrowser.selectedBrowser.contentWindow;

  // Set up observer for app handler loading before we search
  let appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");

  // Search for "applications" to trigger the search results showing the
  // applications section
  let searchQuery = "applications";
  await runSearchInput(searchQuery);

  // Wait for the applications handler to be loaded
  await appHandlerInitialized;

  // Verify applications container is visible in search results
  let container = win.document.getElementById("applicationsHandlersView");
  Assert.ok(container, "Applications handlers view should exist");
  Assert.ok(
    BrowserTestUtils.isVisible(container),
    "Applications handlers view should be visible in search results"
  );

  // Verify that handler items were actually loaded
  let handlerItems = container.querySelectorAll("moz-box-item");
  Assert.greater(
    handlerItems.length,
    0,
    "Should have at least one application handler item in search results"
  );

  // Verify at least the PDF handler is present and visible
  let pdfItem = container.querySelector("moz-box-item[type='application/pdf']");
  Assert.ok(
    pdfItem,
    "PDF application item should be present in search results"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(pdfItem),
    "PDF item should be visible in search results"
  );
});
