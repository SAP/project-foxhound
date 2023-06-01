/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests QuickActions related to DevTools.
 */

"use strict";

requestLongerTimeout(2);

ChromeUtils.defineESModuleGetters(this, {
  DevToolsShim: "chrome://devtools-startup/content/DevToolsShim.sys.mjs",
});

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quickactions.enabled", true],
      ["browser.urlbar.suggest.quickactions", true],
      ["browser.urlbar.shortcuts.quickactions", true],
    ],
  });
});

const assertActionButtonStatus = async (name, expectedEnabled, description) => {
  await BrowserTestUtils.waitForCondition(() =>
    window.document.querySelector(`[data-key=${name}]`)
  );
  const target = window.document.querySelector(`[data-key=${name}]`);
  Assert.equal(!target.hasAttribute("disabled"), expectedEnabled, description);
};

add_task(async function test_inspector() {
  const testData = [
    {
      description: "Test for 'about:' page",
      page: "about:home",
      isDevToolsUser: true,
      actionVisible: true,
      actionEnabled: true,
    },
    {
      description: "Test for another 'about:' page",
      page: "about:about",
      isDevToolsUser: true,
      actionVisible: true,
      actionEnabled: true,
    },
    {
      description: "Test for another devtools-toolbox page",
      page: "about:devtools-toolbox",
      isDevToolsUser: true,
      actionVisible: true,
      actionEnabled: false,
    },
    {
      description: "Test for web content",
      page: "https://example.com",
      isDevToolsUser: true,
      actionVisible: true,
      actionEnabled: true,
    },
    {
      description: "Test for disabled DevTools",
      page: "https://example.com",
      prefs: [["devtools.policy.disabled", true]],
      isDevToolsUser: true,
      actionVisible: true,
      actionEnabled: false,
    },
    {
      description: "Test for not DevTools user",
      page: "https://example.com",
      isDevToolsUser: false,
      actionVisible: true,
      actionEnabled: false,
    },
    {
      description: "Test for fully disabled",
      page: "https://example.com",
      prefs: [["devtools.policy.disabled", true]],
      isDevToolsUser: false,
      actionVisible: false,
    },
  ];

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  for (const {
    description,
    page,
    prefs = [],
    isDevToolsUser,
    actionEnabled,
    actionVisible,
  } of testData) {
    info(description);

    info("Set preferences");
    await SpecialPowers.pushPrefEnv({
      set: [...prefs, ["devtools.selfxss.count", isDevToolsUser ? 5 : 0]],
    });

    info("Check the button status");
    const onLoad = BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);
    BrowserTestUtils.loadURIString(gBrowser.selectedBrowser, page);
    await onLoad;
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "inspector",
    });

    if (actionVisible) {
      await assertActionButtonStatus(
        "inspect",
        actionEnabled,
        "The status of action button is correct"
      );
    } else {
      const target = window.document.querySelector(`[data-key=inspect]`);
      Assert.ok(!target, "Inspect button should not be displayed");
    }

    await SpecialPowers.popPrefEnv();

    if (!actionEnabled) {
      continue;
    }

    info("Do inspect action");
    EventUtils.synthesizeKey("KEY_ArrowDown", {}, window);
    EventUtils.synthesizeKey("KEY_Enter", {}, window);
    await BrowserTestUtils.waitForCondition(
      () => DevToolsShim.hasToolboxForTab(gBrowser.selectedTab),
      "Wait for opening inspector for current selected tab"
    );
    const toolbox = await DevToolsShim.getToolboxForTab(gBrowser.selectedTab);
    await BrowserTestUtils.waitForCondition(
      () => toolbox.getPanel("inspector"),
      "Wait until the inspector is ready"
    );

    info("Do inspect action again in the same page during opening inspector");
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "inspector",
    });
    await assertActionButtonStatus(
      "inspect",
      false,
      "The action button should be disabled since the inspector is already opening"
    );

    info(
      "Select another tool to check whether the inspector will be selected in next test even if the previous tool is not inspector"
    );
    await toolbox.selectTool("options");
    await toolbox.destroy();
  }

  BrowserTestUtils.removeTab(tab);
});
