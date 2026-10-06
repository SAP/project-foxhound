var gMimeSvc = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
var gHandlerSvc = Cc["@mozilla.org/uriloader/handler-service;1"].getService(
  Ci.nsIHandlerService
);
const testItemType = "text/x-test-handler";

SimpleTest.requestCompleteLog();

function setupFakeHandler() {
  let info = gMimeSvc.getFromTypeAndExtension("text/plain", "foo.txt");
  ok(
    info.possibleLocalHandlers.length,
    "Should have at least one known handler"
  );
  let handler = info.possibleLocalHandlers.queryElementAt(
    0,
    Ci.nsILocalHandlerApp
  );

  let infoToModify = gMimeSvc.getFromTypeAndExtension(
    "text/x-test-handler",
    null
  );
  infoToModify.possibleApplicationHandlers.appendElement(handler);

  gHandlerSvc.store(infoToModify);
}

add_task(async function () {
  setupFakeHandler();

  let appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");

  let prefs = await openPreferencesViaOpenPreferencesAPI("downloads", {
    leaveOpen: true,
  });

  is(prefs.selectedPane, "paneDownloads", "Downloads pane was selected");
  let win = gBrowser.selectedBrowser.contentWindow;

  await appHandlerInitialized;

  let container = win.document.getElementById("applicationsHandlersView");
  ok(container, "handlersView is present");

  let ourItem = container.querySelector(`moz-box-item[type="${testItemType}"]`);
  ok(ourItem, "at least one item is present");
  ourItem.scrollIntoView();

  let list = ourItem.querySelector(".actionsMenu");

  let chooseItem = list.querySelector(".choose-app-item");

  let dialogLoadedPromise = promiseLoadSubDialog(
    "chrome://global/content/appPicker.xhtml"
  );
  /**
   * Must choose option by manually changing to replicate
   * what the component does to select an option.
   */
  list.value = chooseItem.value;
  list.dispatchEvent(new CustomEvent("change"));
  await list.updateComplete;

  let dialog = await dialogLoadedPromise;
  ok(dialog, "Dialog loaded");

  let dialogDoc = dialog.document;
  let dialogElement = dialogDoc.getElementById("app-picker");
  let dialogList = dialogDoc.getElementById("app-picker-listbox");
  dialogList.selectItem(dialogList.firstElementChild);
  let selectedApp = dialogList.firstElementChild.handlerApp;

  let dialogClosePromise = BrowserTestUtils.waitForEvent(
    dialog,
    "dialogclosing"
  );
  dialogElement.acceptDialog();
  await dialogClosePromise;

  // Verify results are correct in mime service:
  let mimeInfo = gMimeSvc.getFromTypeAndExtension(testItemType, null);
  ok(
    mimeInfo.preferredApplicationHandler.equals(selectedApp),
    "App should be set as preferred."
  );

  const selectedAppItem = list.querySelector(
    `moz-option[value="${list.value}"]`
  );
  ok(
    selectedAppItem.handlerApp.equals(selectedApp),
    "Selected item matches app in dropdown"
  );

  // Now try to 'manage' this list:
  dialogLoadedPromise = promiseLoadSubDialog(
    "chrome://browser/content/preferences/dialogs/applicationManager.xhtml"
  );

  let manageItem = list.querySelector(".manage-app-item");
  list.value = manageItem.value;
  list.dispatchEvent(new CustomEvent("change"));
  await list.updateComplete;

  dialog = await dialogLoadedPromise;
  ok(dialog, "Dialog loaded the second time");

  dialogDoc = dialog.document;
  dialogElement = dialogDoc.getElementById("appManager");
  dialogList = dialogDoc.getElementById("appList");
  let itemToRemove = dialogList.querySelector(
    'richlistitem > label[value="' + selectedApp.name + '"]'
  ).parentNode;
  dialogList.selectItem(itemToRemove);
  let itemsBefore = dialogList.children.length;
  dialogDoc.getElementById("remove").click();
  ok(!itemToRemove.parentNode, "Item got removed from DOM");
  is(dialogList.children.length, itemsBefore - 1, "Item got removed");

  dialogClosePromise = BrowserTestUtils.waitForEvent(dialog, "dialogclosing");
  dialogElement.acceptDialog();
  await dialogClosePromise;

  // Verify results are correct in mime service:
  mimeInfo = gMimeSvc.getFromTypeAndExtension(testItemType, null);
  ok(
    !mimeInfo.preferredApplicationHandler,
    "App should no longer be set as preferred."
  );
  const selectedItem = list.querySelector(`moz-option[value="${list.value}"]`);

  ok(!selectedItem.handlerApp, "No app should be visible as preferred item.");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Regression test for bug 2032690: to ensure the default application shows
 * the real default app's icon ({@link HandlerInfoWrapper.iconURLForSystemDefault}) rather than
 * the hard-coded generic placeholder. Test uses PDF application for use-case.
 */
add_task(async function systemDefaultIconUsesHandlerIconURL() {
  let appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");
  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;
  let pdfItem = win.document.querySelector(
    "moz-box-item[type='application/pdf']"
  );
  let actionsMenu = pdfItem.querySelector(".actionsMenu");
  let useDefaultOption = actionsMenu.querySelector(
    `moz-option[action="${Ci.nsIHandlerInfo.useSystemDefault}"]`
  );

  if (!useDefaultOption) {
    info(
      "PDF has no OS default handler in this environment, so skipping icon assertion."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    return;
  }

  ok(
    actionsMenu.querySelector(
      `moz-option[action="${Ci.nsIHandlerInfo.handleInternally}"]`
    ),
    "PDF has the internal 'Open in Firefox' option alongside the OS default"
  );

  let iconsrc = useDefaultOption.getAttribute("iconsrc");
  ok(
    iconsrc?.startsWith("moz-icon:"),
    `iconsrc should resolve to an OS icon (moz-icon:), got '${iconsrc}'`
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

registerCleanupFunction(function () {
  let infoToModify = gMimeSvc.getFromTypeAndExtension(testItemType, null);
  gHandlerSvc.remove(infoToModify);
});
