/** @import MozSelect, {MozOption} from "../../../../toolkit/content/widgets/moz-select/moz-select.mjs" */

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
  handler1.name = "UniqueMailHandler";
  handler1.uriTemplate = "https://example.com/mail/%s";

  let handler2 = Cc["@mozilla.org/uriloader/web-handler-app;1"].createInstance(
    Ci.nsIWebHandlerApp
  );
  handler2.name = "UniquePDFHandler";
  handler2.uriTemplate = "https://example.com/pdf/%s";
  gDummyHandlers.push(handler1, handler2);

  // Set up our mailto handler test infrastructure.
  let mailtoHandlerInfo = HandlerServiceTestUtils.getHandlerInfo("mailto");
  scrubMailtoHandlers(mailtoHandlerInfo);
  gOriginalPreferredMailHandler = mailtoHandlerInfo.preferredApplicationHandler;
  mailtoHandlerInfo.possibleApplicationHandlers.appendElement(handler1);
  gHandlerService.store(mailtoHandlerInfo);

  // Now do the same for pdf handler:
  let pdfHandlerInfo =
    HandlerServiceTestUtils.getHandlerInfo("application/pdf");
  // PDF doesn't have built-in web handlers, so no need to scrub.
  gOriginalPreferredPDFHandler = pdfHandlerInfo.preferredApplicationHandler;
  pdfHandlerInfo.possibleApplicationHandlers.appendElement(handler2);
  gHandlerService.store(pdfHandlerInfo);

  appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");

  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });

  info("Preferences page opened on the downloads pane.");
});

/**
 * @param {Window} win
 * @param {string} value
 */
function setFilterAndWait(win, value) {
  let filterInput = win.document.getElementById("applicationsFilter");
  filterInput.value = value;
  filterInput.dispatchEvent(new CustomEvent("MozInputSearch:search"));
}

/**
 * @param {MozSelect} list
 * @param {MozOption} item
 */
async function selectItemInList(list, item) {
  list.value = item.value;
  list.dispatchEvent(new CustomEvent("change"));
  await list.updateComplete;
}

add_task(async function testFilterByTypeLabel() {
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;
  let container = win.document.getElementById("applicationsHandlersView");

  let mailItem = container.querySelector("moz-box-item[type='mailto']");
  let pdfItem = container.querySelector("moz-box-item[type='application/pdf']");
  Assert.ok(mailItem, "mailItem is present in handlersView.");
  Assert.ok(pdfItem, "pdfItem is present in handlersView.");

  await win.document.l10n.translateFragment(mailItem);
  let mailLabel = mailItem.label.toLowerCase();

  setFilterAndWait(win, mailLabel.slice(0, 4));
  Assert.ok(
    !mailItem.hidden,
    "mailto item should be visible when its label matches the filter"
  );
  Assert.ok(
    pdfItem.hidden,
    "pdf item should be hidden when its label does not match the filter"
  );

  setFilterAndWait(win, "");
  Assert.ok(
    !mailItem.hidden,
    "mailto item should be visible after clearing filter"
  );
  Assert.ok(
    !pdfItem.hidden,
    "pdf item should be visible after clearing filter"
  );
});

add_task(async function testFilterByActionLabel() {
  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;
  let container = win.document.getElementById("applicationsHandlersView");

  let mailItem = container.querySelector("moz-box-item[type='mailto']");
  let pdfItem = container.querySelector("moz-box-item[type='application/pdf']");
  Assert.ok(mailItem, "mailItem is present in handlersView.");
  Assert.ok(pdfItem, "pdfItem is present in handlersView.");

  // Select UniqueMailHandler as the action for mailto so its label is the selected option.
  let mailList = mailItem.querySelector(".actionsMenu");
  let mailHandlerOption = mailList.querySelector(
    "moz-option[data-l10n-args*='UniqueMailHandler']"
  );
  Assert.ok(
    mailHandlerOption,
    "UniqueMailHandler option is present in mailto actions"
  );
  await selectItemInList(mailList, mailHandlerOption);
  await win.document.l10n.translateFragment(mailHandlerOption);
  await win.document.l10n.translateFragment(mailItem);

  // Select UniquePDFHandler as the action for pdf.
  let pdfList = pdfItem.querySelector(".actionsMenu");
  let pdfHandlerOption = pdfList.querySelector(
    "moz-option[data-l10n-args*='UniquePDFHandler']"
  );
  Assert.ok(
    pdfHandlerOption,
    "UniquePDFHandler option is present in pdf actions"
  );
  await selectItemInList(pdfList, pdfHandlerOption);
  await win.document.l10n.translateFragment(pdfHandlerOption);
  await win.document.l10n.translateFragment(pdfItem);

  // Filter by a prefix common to both action labels — both items should be visible.
  setFilterAndWait(win, "unique");
  Assert.ok(
    !mailItem.hidden,
    "mailto item should be visible when filter matches its selected action label"
  );
  Assert.ok(
    !pdfItem.hidden,
    "pdf item should be visible when filter matches its selected action label"
  );

  // Filter by the mail handler name — should match mailto via action label, not pdf.
  setFilterAndWait(win, "uniquemailhandler");
  Assert.ok(
    !mailItem.hidden,
    "mailto item should be visible when its selected action label matches the filter"
  );
  Assert.ok(
    pdfItem.hidden,
    "pdf item should be hidden when neither its type label nor action label matches"
  );

  // Filter by the pdf handler name — should match pdf via action label, not mailto.
  setFilterAndWait(win, "uniquepdfhandler");
  Assert.ok(
    mailItem.hidden,
    "mailto item should be hidden when neither its type label nor action label matches"
  );
  Assert.ok(
    !pdfItem.hidden,
    "pdf item should be visible when its selected action label matches the filter"
  );

  setFilterAndWait(win, "");
  Assert.ok(
    !mailItem.hidden,
    "mailto item should be visible after clearing filter"
  );
  Assert.ok(
    !pdfItem.hidden,
    "pdf item should be visible after clearing filter"
  );
});
