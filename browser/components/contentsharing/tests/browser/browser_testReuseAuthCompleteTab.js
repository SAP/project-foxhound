/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests the post-login side of the share flow: after finishing login, when
// FxA redirects to the redirect URL (/auth-complete), asserts that we reuse
// that tab to load the share, instead of loading the share in a new tab.
add_task(async function reuses_auth_complete_tab_after_login() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentsharing.automation.detectLoginTimeoutMS", 10000]],
  });

  await withContentSharingMockServer(async server => {
    clearCookies();

    // Open a tab to the auth-complete endpoint shown after signing in.
    const authTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      ContentSharingUtils.redirectURL
    );

    const sharedTabs = [
      BrowserTestUtils.addTab(gBrowser, "https://example.com"),
      BrowserTestUtils.addTab(gBrowser, "https://example.com?1"),
    ];
    await Promise.all(
      sharedTabs.map(t => BrowserTestUtils.browserLoaded(t.linkedBrowser))
    );

    // Wait for the tab to redirect before we assert on its URL.
    const authTabLoadedShareURL = BrowserTestUtils.browserLoaded(
      authTab.linkedBrowser,
      false,
      server.mockShareURL
    );

    // Kick off the share flow, simulating completion by closing the dialog
    // and setting the cookie.
    const sharePromise = ContentSharingUtils.handleShareTabs(sharedTabs);
    await TestUtils.waitForCondition(() => window.gDialogBox.isOpen);
    window.gDialogBox.dialog.close();

    // handleShareTabs indirectly wires up the cookie observer; wait for it
    // before setting the cookie to avoid problems in chaos mode.
    await TestUtils.waitForCondition(
      () => ContentSharingUtils.observingCookieChange,
      "detectLogin registered its cookie-changed observer"
    );
    setCookie("auth", "1");

    await sharePromise;
    await authTabLoadedShareURL;

    Assert.equal(
      gBrowser.selectedTab,
      authTab,
      "Auth-complete tab is the selected tab"
    );
    Assert.equal(
      authTab.linkedBrowser.currentURI.spec,
      server.mockShareURL,
      "Auth-complete tab navigated to the share URL"
    );

    BrowserTestUtils.removeTab(authTab);
    gBrowser.removeTabs(sharedTabs);

    clearCookies();
  });
});
