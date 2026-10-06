/** @import MozSelect, {MozOption} from "../../../../toolkit/content/widgets/moz-select/moz-select.mjs" */
/** @import MozBoxItem from "../../../../toolkit/content/widgets/moz-box-item/moz-box-item.mjs";*/

SimpleTest.requestCompleteLog();
const { HandlerServiceTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/HandlerServiceTestUtils.sys.mjs"
);

let gHandlerService = Cc["@mozilla.org/uriloader/handler-service;1"].getService(
  Ci.nsIHandlerService
);

let gOldMailHandlers = [];
let gDummyHandlers = [];
let gOriginalPreferredMailHandler;
let gOriginalPreferredPDFHandler;

/**
 * @type {Promise<void>}
 */
let appHandlerInitialized;

registerCleanupFunction(function () {
  function removeDummyHandlers(handlers) {
    // Remove any of the dummy handlers we created.
    for (let i = handlers.Count() - 1; i >= 0; i--) {
      try {
        if (
          gDummyHandlers.some(
            h =>
              h.uriTemplate ==
              handlers.queryElementAt(i, Ci.nsIWebHandlerApp).uriTemplate
          )
        ) {
          handlers.removeElementAt(i);
        }
      } catch (ex) {
        /* ignore non-web-app handlers */
      }
    }
  }
  // Re-add the original protocol handlers:
  let mailHandlerInfo = HandlerServiceTestUtils.getHandlerInfo("mailto");
  let mailHandlers = mailHandlerInfo.possibleApplicationHandlers;
  for (let h of gOldMailHandlers) {
    mailHandlers.appendElement(h);
  }
  removeDummyHandlers(mailHandlers);
  mailHandlerInfo.preferredApplicationHandler = gOriginalPreferredMailHandler;
  gHandlerService.store(mailHandlerInfo);

  let pdfHandlerInfo =
    HandlerServiceTestUtils.getHandlerInfo("application/pdf");
  removeDummyHandlers(pdfHandlerInfo.possibleApplicationHandlers);
  pdfHandlerInfo.preferredApplicationHandler = gOriginalPreferredPDFHandler;
  gHandlerService.store(pdfHandlerInfo);

  gBrowser.removeCurrentTab();
});

function scrubMailtoHandlers(handlerInfo) {
  // Remove extant web handlers because they have icons that
  // we fetch from the web, which isn't allowed in tests.
  let handlers = handlerInfo.possibleApplicationHandlers;
  for (let i = handlers.Count() - 1; i >= 0; i--) {
    try {
      let handler = handlers.queryElementAt(i, Ci.nsIWebHandlerApp);
      gOldMailHandlers.push(handler);
      // If we get here, this is a web handler app. Remove it:
      handlers.removeElementAt(i);
    } catch (ex) {}
  }
}

add_setup(async function () {
  // Create our dummy handlers
  let handler1 = Cc["@mozilla.org/uriloader/web-handler-app;1"].createInstance(
    Ci.nsIWebHandlerApp
  );
  handler1.name = "Handler 1";
  handler1.uriTemplate = "https://example.com/first/%s";

  let handler2 = Cc["@mozilla.org/uriloader/web-handler-app;1"].createInstance(
    Ci.nsIWebHandlerApp
  );
  handler2.name = "Handler 2";
  handler2.uriTemplate = "https://example.org/second/%s";
  gDummyHandlers.push(handler1, handler2);

  function substituteWebHandlers(handlerInfo) {
    // Append the dummy handlers to replace them:
    let handlers = handlerInfo.possibleApplicationHandlers;
    handlers.appendElement(handler1);
    handlers.appendElement(handler2);
    gHandlerService.store(handlerInfo);
  }
  // Set up our mailto handler test infrastructure.
  let mailtoHandlerInfo = HandlerServiceTestUtils.getHandlerInfo("mailto");
  scrubMailtoHandlers(mailtoHandlerInfo);
  gOriginalPreferredMailHandler = mailtoHandlerInfo.preferredApplicationHandler;
  substituteWebHandlers(mailtoHandlerInfo);

  // Now do the same for pdf handler:
  let pdfHandlerInfo =
    HandlerServiceTestUtils.getHandlerInfo("application/pdf");
  // PDF doesn't have built-in web handlers, so no need to scrub.
  gOriginalPreferredPDFHandler = pdfHandlerInfo.preferredApplicationHandler;
  substituteWebHandlers(pdfHandlerInfo);

  appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");

  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });

  info("Preferences page opened on the downloads pane.");
});

/**
 * @param {MozBoxItem} itemToUse
 */
async function selectStandardOptions(itemToUse) {
  /**
   * @type {MozSelect}
   */
  const list = itemToUse.querySelector(".actionsMenu");
  /**
   * @param {MozOption} item
   */
  async function selectItemInPopup(item) {
    list.value = item.value;
    list.dispatchEvent(new CustomEvent("change"));
    await list.updateComplete;
    return item;
  }

  let itemType = itemToUse.getAttribute("type");
  // select one of our test cases:
  let handlerItem = list.querySelector(
    "moz-option[data-l10n-args*='Handler 1']"
  );
  await selectItemInPopup(handlerItem);
  let { preferredAction, alwaysAskBeforeHandling } =
    HandlerServiceTestUtils.getHandlerInfo(itemType);
  Assert.notEqual(
    preferredAction,
    Ci.nsIHandlerInfo.alwaysAsk,
    "Should have selected something other than 'always ask' (" + itemType + ")"
  );
  Assert.ok(
    !alwaysAskBeforeHandling,
    "Should have turned off asking before handling (" + itemType + ")"
  );

  // Test the alwaysAsk option
  let alwaysAskItem = list.querySelector(
    `moz-option[action="${Ci.nsIHandlerInfo.alwaysAsk}"]`
  );
  await selectItemInPopup(alwaysAskItem);
  Assert.equal(
    list.value,
    alwaysAskItem.value,
    "Should have selected always ask item (" + itemType + ")"
  );
  alwaysAskBeforeHandling =
    HandlerServiceTestUtils.getHandlerInfo(itemType).alwaysAskBeforeHandling;
  Assert.ok(
    alwaysAskBeforeHandling,
    "Should have turned on asking before handling (" + itemType + ")"
  );

  let useDefaultItem = list.getElementsByAttribute(
    "action",
    Ci.nsIHandlerInfo.useSystemDefault
  );
  useDefaultItem = useDefaultItem && useDefaultItem[0];
  if (useDefaultItem) {
    await selectItemInPopup(useDefaultItem);
    Assert.equal(
      list.value,
      useDefaultItem.value,
      "Should have selected 'use default' item (" + itemType + ")"
    );
    preferredAction =
      HandlerServiceTestUtils.getHandlerInfo(itemType).preferredAction;
    Assert.equal(
      preferredAction,
      Ci.nsIHandlerInfo.useSystemDefault,
      "Should have selected 'use default' (" + itemType + ")"
    );
  } else {
    // Whether there's a "use default" item depends on the OS, so it's not
    // possible to rely on it being the case or not.
    info("No 'Use default' item, so not testing (" + itemType + ")");
  }

  // Select a web app item.
  let webAppItems = Array.from(
    list.getElementsByAttribute("action", Ci.nsIHandlerInfo.useHelperApp)
  );
  webAppItems = webAppItems.filter(
    item => item.handlerApp instanceof Ci.nsIWebHandlerApp
  );

  // Wait for labels to be populated before comparing them
  await BrowserTestUtils.waitForMutationCondition(
    list,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["label"],
    },
    () => webAppItems.every(item => item.label && item.label.trim() !== "")
  );

  Assert.equal(
    webAppItems.length,
    2,
    "Should have 2 web application handler. (" + itemType + ")"
  );

  Assert.notEqual(
    webAppItems[0].label,
    webAppItems[1].label,
    "Should have 2 different web app handlers"
  );
  let selectedItem = await selectItemInPopup(webAppItems[0]);

  // Test that the selected item label is the same as the label
  // of the menu item.
  let win = gBrowser.selectedBrowser.contentWindow;
  await win.document.l10n.translateFragment(selectedItem);
  await win.document.l10n.translateFragment(itemToUse);
  Assert.equal(
    selectedItem.value,
    list.value,
    "Should have selected correct item (" + itemType + ")"
  );

  // select the other web app item
  selectedItem = await selectItemInPopup(webAppItems[1]);

  // Test that the selected item label is the same as the label
  // of the menu item
  await win.document.l10n.translateFragment(selectedItem);
  await win.document.l10n.translateFragment(itemToUse);
  Assert.equal(
    selectedItem.value,
    list.value,
    "Should have selected correct item (" + itemType + ")"
  );
}

add_task(async function checkDropdownBehavior() {
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;

  let container = win.document.getElementById("applicationsHandlersView");

  // First check a protocol handler item.
  let mailItem = container.querySelector("moz-box-item[type='mailto']");
  Assert.ok(mailItem, "mailItem is present in handlersView.");
  await selectStandardOptions(mailItem);

  // Then check a content menu item.
  let pdfItem = container.querySelector("moz-box-item[type='application/pdf']");
  Assert.ok(pdfItem, "pdfItem is present in handlersView.");
  await selectStandardOptions(pdfItem);
});

add_task(async function checkListKeyboardNavigation() {
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;
  let container = win.document.getElementById("applicationsHandlersView");
  await container.updateComplete;

  let items = Array.from(container.querySelectorAll("moz-box-item[position]"));
  let [firstItem, secondItem] = items;
  Assert.greater(items.length, 1, "There is more than one handler row.");

  // Every row is focusable.
  Assert.ok(
    items.every(item => item.isFocusable),
    "Every list item is focusable."
  );

  // Focusing a row and pressing ArrowDown/ArrowUp moves between rows.
  firstItem.focus();
  Assert.equal(
    win.document.activeElement,
    firstItem,
    "The first row is focused."
  );

  EventUtils.synthesizeKey("KEY_ArrowDown", {}, win);
  Assert.equal(
    win.document.activeElement,
    secondItem,
    "ArrowDown moves focus to the next row."
  );

  EventUtils.synthesizeKey("KEY_ArrowUp", {}, win);
  Assert.equal(
    win.document.activeElement,
    firstItem,
    "ArrowUp moves focus back to the previous row."
  );

  // Tab moves focus from the focused row into its actions menu (moz-select).
  let actionsMenu = firstItem.querySelector(".actionsMenu");
  Assert.ok(actionsMenu, "The row has an actions menu.");

  EventUtils.synthesizeKey("KEY_Tab", {}, win);
  Assert.equal(
    win.document.activeElement,
    actionsMenu,
    "Tab moves focus to the actions menu in the row."
  );

  // Tab again moves focus out of the group rather than to the next row.
  EventUtils.synthesizeKey("KEY_Tab", {}, win);
  Assert.ok(
    !container.contains(win.document.activeElement),
    "Tab from the actions menu moves focus out of the group."
  );
});
