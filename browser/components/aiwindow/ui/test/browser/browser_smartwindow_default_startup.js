/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

const PREF_IS_DEFAULT_WINDOW = "browser.smartwindow.isDefaultWindow";

/* test that onFirstWindowReady promotes the window to Smart when the
default-window pref is on and the user is signed in */
add_task(async function test_onFirstWindowReady_promotes_when_default_active() {
  await SpecialPowers.pushPrefEnv({
    set: [[PREF_IS_DEFAULT_WINDOW, true]],
  });

  const restoreSignIn = skipSignIn();
  const win = await BrowserTestUtils.openNewBrowserWindow();

  try {
    await AIWindow.onFirstWindowReady(win);

    Assert.ok(
      win.document.documentElement.hasAttribute("ai-window"),
      "Window is promoted to Smart when default-window pref is on and user is signed in"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await SpecialPowers.popPrefEnv();
  }
});

/* test that onFirstWindowReady leaves the window classic when the
default-window pref is off */
add_task(
  async function test_onFirstWindowReady_does_not_promote_when_pref_off() {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_IS_DEFAULT_WINDOW, false]],
    });

    const win = await BrowserTestUtils.openNewBrowserWindow();

    try {
      await AIWindow.onFirstWindowReady(win);

      Assert.ok(
        !win.document.documentElement.hasAttribute("ai-window"),
        "Window stays classic when default-window pref is off"
      );
    } finally {
      await BrowserTestUtils.closeWindow(win);
      await SpecialPowers.popPrefEnv();
    }
  }
);

/* test that onFirstWindowReady leaves the window classic when the user
declines sign-in */
add_task(
  async function test_onFirstWindowReady_does_not_promote_when_auth_fails() {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_IS_DEFAULT_WINDOW, true]],
    });

    // Simulate a user who declines sign-in: ensureAIWindowAccess returns false.
    const authStub = sinon
      .stub(AIWindowAccountAuth, "ensureAIWindowAccess")
      .resolves(false);
    const win = await BrowserTestUtils.openNewBrowserWindow();

    try {
      await AIWindow.onFirstWindowReady(win);

      Assert.ok(
        !win.document.documentElement.hasAttribute("ai-window"),
        "Window stays classic when the user declines sign-in"
      );
    } finally {
      await BrowserTestUtils.closeWindow(win);
      authStub.restore();
      await SpecialPowers.popPrefEnv();
    }
  }
);

/* test that onFirstWindowReady skips private browsing windows */
add_task(async function test_onFirstWindowReady_skips_private_windows() {
  await SpecialPowers.pushPrefEnv({
    set: [[PREF_IS_DEFAULT_WINDOW, true]],
  });

  const restoreSignIn = skipSignIn();
  const win = await BrowserTestUtils.openNewBrowserWindow({ private: true });

  try {
    await AIWindow.onFirstWindowReady(win);

    Assert.ok(
      !win.document.documentElement.hasAttribute("ai-window"),
      "Private windows are not promoted to Smart even when the default pref is on"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
    restoreSignIn();
    await SpecialPowers.popPrefEnv();
  }
});

/* test that getFirstWindowArgs substitutes about:home with the Smart Window
  new tab URL when Smart Window is set as default and the user is signed in */
add_task(
  async function test_getFirstWindowArgs_substitutes_when_smart_default() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.isDefaultWindow", true],
        ["browser.smartwindow.tos.consentTime", 1],
        ["browser.startup.page", 1],
      ],
    });

    Assert.equal(
      Cc["@mozilla.org/browser/clh;1"]
        .getService(Ci.nsIBrowserHandler)
        .getFirstWindowArgs(),
      AIWINDOW_URL,
      "Substitutes about:home with AIWINDOW_URL when Smart Window is default"
    );
    await SpecialPowers.popPrefEnv();
  }
);

/* test that getFirstWindowArgs substitutes with first run url when user has not completed it */
add_task(
  async function test_getFirstWindowArgs_returns_firstrun_when_not_completed() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.isDefaultWindow", true],
        ["browser.smartwindow.tos.consentTime", 1],
        ["browser.smartwindow.firstrun.hasCompleted", false],
        ["browser.startup.page", 1],
      ],
    });

    Assert.equal(
      Cc["@mozilla.org/browser/clh;1"]
        .getService(Ci.nsIBrowserHandler)
        .getFirstWindowArgs(),
      FIRSTRUN_URL,
      "Substitutes about:home with FIRSTRUN_URL when firstrun is incomplete"
    );
    await SpecialPowers.popPrefEnv();
  }
);

/* test that getFirstWindowArgs doesn't substitute a custom homepage */
add_task(async function test_getFirstWindowArgs_respects_custom_homepage() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.smartwindow.isDefaultWindow", true],
      ["browser.smartwindow.tos.consentTime", 1],
      ["browser.startup.homepage", "https://example.com/"],
      ["browser.startup.page", 1],
    ],
  });

  Assert.equal(
    Cc["@mozilla.org/browser/clh;1"]
      .getService(Ci.nsIBrowserHandler)
      .getFirstWindowArgs(),
    "https://example.com/",
    "Does NOT substitute when user has a custom homepage"
  );
  await SpecialPowers.popPrefEnv();
});

/* test that getFirstWindowArgs doesn't substitute when user has never signed in */
add_task(
  async function test_getFirstWindowArgs_does_not_substitute_without_consent() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.isDefaultWindow", true],
        ["browser.smartwindow.tos.consentTime", 0],
        ["browser.startup.page", 1],
      ],
    });

    Assert.equal(
      Cc["@mozilla.org/browser/clh;1"]
        .getService(Ci.nsIBrowserHandler)
        .getFirstWindowArgs(),
      "about:home",
      "Does NOT substitute when user has never signed in"
    );
    await SpecialPowers.popPrefEnv();
  }
);

/* test that getFirstWindowArgs does NOT substitute when Smart Window is not
  the default */
add_task(
  async function test_getFirstWindowArgs_does_not_substitute_when_not_default() {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.smartwindow.isDefaultWindow", false],
        ["browser.smartwindow.tos.consentTime", 1],
        ["browser.startup.page", 1],
      ],
    });

    Assert.equal(
      Cc["@mozilla.org/browser/clh;1"]
        .getService(Ci.nsIBrowserHandler)
        .getFirstWindowArgs(),
      "about:home",
      "Does NOT substitute when Smart Window is not default"
    );
    await SpecialPowers.popPrefEnv();
  }
);
