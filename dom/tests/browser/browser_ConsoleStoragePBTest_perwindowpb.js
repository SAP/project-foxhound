/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const testURI =
  "http://example.com/browser/dom/tests/browser/test-console-api.html";

function getInnerWindowId(aWindow) {
  return aWindow.windowGlobalChild.innerWindowId;
}

async function doTest(aIsPrivateMode) {
  const window = await BrowserTestUtils.openNewBrowserWindow({
    private: aIsPrivateMode,
  });

  const ConsoleAPIStorage = Cc["@mozilla.org/consoleAPI-storage;1"].getService(
    Ci.nsIConsoleAPIStorage
  );

  const innerID = getInnerWindowId(window);
  const beforeEvents = ConsoleAPIStorage.getEvents(innerID);
  BrowserTestUtils.startLoadingURIString(
    window.gBrowser.selectedBrowser,
    testURI
  );

  await BrowserTestUtils.browserLoaded(window.gBrowser.selectedBrowser, {
    wantLoad: testURI,
  });

  const consoleEventPromise = new Promise(res => {
    function listener() {
      ConsoleAPIStorage.removeLogEventListener(listener);
      res();
    }
    ConsoleAPIStorage.addLogEventListener(
      listener,
      window.document.nodePrincipal
    );
  });

  window.nativeConsole.log("foo bar baz (private: " + aIsPrivateMode + ")");

  await consoleEventPromise;

  const afterEvents = ConsoleAPIStorage.getEvents(innerID);
  // We expect that console API messages are always stored.
  is(
    beforeEvents.length == afterEvents.length - 1,
    true,
    "storage should occur"
  );

  await BrowserTestUtils.closeWindow(window);
}

add_task(async function test_console_storage() {
  await doTest(false);
});

add_task(async function test_console_storage_private_browsing() {
  await doTest(true);
});
