/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* global openAIWindowWithSidebar, skipSignIn, stubEngineNetworkBoundaries,
   submitSmartbar, typeInSmartbar */

// Closing the website tab that owns the captured browsingContext aborts the
// in-flight sidebar generation.
add_task(async function test_tab_close_aborts_sidebar_generation() {
  const { restore } = await stubEngineNetworkBoundaries();
  const restoreSignIn = skipSignIn();
  const { win, sidebarBrowser } = await openAIWindowWithSidebar();
  const tab = win.gBrowser.selectedTab;

  // Keep the window alive after removing the captured tab; otherwise window
  // teardown would abort the request and mask whether the per-tab listener
  // actually fires.
  await BrowserTestUtils.openNewForegroundTab(win.gBrowser, "about:blank");
  win.gBrowser.selectedTab = tab;

  const pending = Promise.withResolvers();
  const sidebarCall = Promise.withResolvers();
  const fetchStub = sinon.stub(Chat, "fetchWithHistory").callsFake(args => {
    sidebarCall.resolve(args);
    return pending.promise;
  });

  try {
    await typeInSmartbar(sidebarBrowser, "from sidebar");
    await submitSmartbar(sidebarBrowser);
    const { signal } = await sidebarCall.promise;

    Assert.ok(
      !signal.aborted,
      "Signal should not be aborted while the tab is alive"
    );

    await BrowserTestUtils.removeTab(tab);
    await TestUtils.waitForCondition(
      () => signal.aborted,
      "Signal should be aborted after the captured tab is closed"
    );
    Assert.ok(
      !win.closed,
      "Window should remain open; abort came from the single tab close"
    );
  } finally {
    pending.resolve();
    fetchStub.restore();
    restoreSignIn();
    await restore();
    if (!win.closed) {
      await BrowserTestUtils.closeWindow(win);
    }
  }
});
