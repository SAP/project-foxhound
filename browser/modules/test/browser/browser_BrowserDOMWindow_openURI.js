/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TaskbarTabs: "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs",
  TaskbarTabsPin: "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs",
});

sinon.stub(TaskbarTabsPin, "pinTaskbarTab");
sinon.stub(TaskbarTabsPin, "unpinTaskbarTab");

registerCleanupFunction(async () => {
  sinon.restore();
});

const BASE_URL = "https://example.org";

add_task(async function test_popupWindowOpensNewTabsInParent() {
  await BrowserTestUtils.withNewTab(BASE_URL, async browser => {
    const windowPromise = BrowserTestUtils.domWindowOpenedAndLoaded();
    SpecialPowers.spawn(browser, [], () => {
      content.window.open(
        content.location.href,
        "_blank",
        "height=500,width=500,menubar=no,toolbar=no,status=1,resizable=1"
      );
    });

    const win = await windowPromise;
    const context = win.browserDOMWindow.openURI(
      Services.io.newURI(BASE_URL),
      null,
      0,
      Ci.nsIBrowserDOMWindow.OPEN_NEWTAB,
      Services.scriptSecurityManager.getSystemPrincipal()
    );
    is(
      context.topChromeWindow,
      window,
      "new tab from popup opened in original window"
    );

    gBrowser.removeTab(gBrowser.getTabForBrowser(context.embedderElement));
    await BrowserTestUtils.closeWindow(win);
  });
});

add_task(async function test_taskbarTabWindowOpensNewTabsInParent() {
  if (AppConstants.platform != "win") {
    // Bug 1973833 - Taskbar Tabs is only available on Windows right now
    ok(true, "disabled on this platform");
    return;
  }

  const uri = Services.io.newURI(BASE_URL);
  const { taskbarTab } = await TaskbarTabs.findOrCreateTaskbarTab(uri, 0);
  const win = await TaskbarTabs.openWindow(taskbarTab);

  const context = win.browserDOMWindow.openURI(
    uri,
    null,
    0,
    Ci.nsIBrowserDOMWindow.OPEN_NEWTAB,
    Services.scriptSecurityManager.getSystemPrincipal()
  );
  is(
    context.topChromeWindow,
    window,
    "new tab from taskbar tab opened in original window"
  );

  gBrowser.removeTab(gBrowser.getTabForBrowser(context.embedderElement));
  await BrowserTestUtils.closeWindow(win);
  await TaskbarTabs.removeTaskbarTab(taskbarTab.id);
});
