/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const HandlerService = Cc[
  "@mozilla.org/uriloader/handler-service;1"
].getService(Ci.nsIHandlerService);

const MIMEService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

// This test checks that application/xml has the handle internally option.
add_task(async function applicationXmlHandleInternally() {
  const mimeInfo = MIMEService.getFromTypeAndExtension(
    "application/xml",
    "xml"
  );
  HandlerService.store(mimeInfo);
  registerCleanupFunction(() => {
    HandlerService.remove(mimeInfo);
  });

  let appHandlerInitialized = TestUtils.topicObserved("app-handler-loaded");

  await openPreferencesViaOpenPreferencesAPI("downloads", { leaveOpen: true });

  await appHandlerInitialized;

  let win = gBrowser.selectedBrowser.contentWindow;

  let container = win.document.getElementById("applicationsHandlersView");

  // First, find the application/xml item.
  let xmlItem = container.querySelector("moz-box-item[type='application/xml']");
  Assert.ok(xmlItem, "application/xml is present in handlersView");
  if (xmlItem) {
    xmlItem.scrollIntoView({ block: "center" });
    let list = xmlItem.closest("moz-box-group");

    let handleInternallyItem = list.querySelector(
      `moz-option[action='${Ci.nsIHandlerInfo.handleInternally}']`
    );

    ok(!!handleInternallyItem, "handle internally is present");
  }

  gBrowser.removeCurrentTab();
});
