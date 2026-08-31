/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

loadTestSubscript("head_unified_extensions.js");

const { CustomizableUITestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/CustomizableUITestUtils.sys.mjs"
);
let gCUITestUtils = new CustomizableUITestUtils(window);

function menuItemThatOpensAboutAddons() {
  return PanelUI.panel.querySelector("#appMenu-extensions-themes-button");
}
function menuItemThatOpensExtensionsPanel() {
  return PanelUI.panel.querySelector("#appMenu-unified-extensions-button");
}

add_task(async function test_appmenu_when_button_is_always_shown() {
  await gCUITestUtils.openMainMenu();

  ok(
    BrowserTestUtils.isVisible(menuItemThatOpensAboutAddons()),
    "'Extensions and themes' menu item is visible by default"
  );

  ok(
    BrowserTestUtils.isHidden(menuItemThatOpensExtensionsPanel()),
    "'Extensions' menu item is hidden by default"
  );

  await gCUITestUtils.hideMainMenu();
});

add_task(async function test_appmenu_when_button_is_hidden() {
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.unifiedExtensions.button.always_visible", false]],
  });
  await gCUITestUtils.openMainMenu();

  ok(
    BrowserTestUtils.isHidden(menuItemThatOpensAboutAddons()),
    "'Extensions and themes' menu item is hidden"
  );

  ok(
    BrowserTestUtils.isVisible(menuItemThatOpensExtensionsPanel()),
    "'Extensions' menu item is shown"
  );

  await gCUITestUtils.hideMainMenu();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_appmenu_extensions_opens_panel() {
  Services.fog.testResetFOG();
  resetExtensionsButtonTelemetry();
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.unifiedExtensions.button.always_visible", false]],
  });
  await gCUITestUtils.openMainMenu();

  assertExtensionsButtonHidden();
  menuItemThatOpensExtensionsPanel().click();
  is(PanelUI.panel.state, "closed", "Menu closed after clicking Extensions");
  // assertExtensionsButtonVisible(); cannot be checked because button showing
  // is async. We will check its visibility later, before closing the panel.

  Assert.deepEqual(
    Glean.extensionsButton.openViaAppMenu.testGetValue().map(e => e.extra),
    [
      {
        is_extensions_panel_empty: "false",
        is_extensions_button_visible: "false",
      },
    ],
    "extensions_button.open_via_app_menu telemetry on menu click"
  );

  const listView = getListView();
  await BrowserTestUtils.waitForEvent(listView, "ViewShown");
  ok(PanelView.forNode(listView).active, "Extensions panel is shown");

  // Just check that it is visible. Verification of the 'Manage Extensions'
  // button is covered by test_panel_has_a_manage_extensions_button.
  ok(
    BrowserTestUtils.isVisible(
      listView.querySelector("#unified-extensions-manage-extensions")
    ),
    "'Manage Extensions' option is visible"
  );

  // Sanity check to show that we indeed had extensions, showing that this test
  // case differs from test_appmenu_extensions_opens_when_no_extensions.
  ok(gUnifiedExtensions.hasExtensionsInPanel(), "Sanity check: has extensions");

  assertExtensionsButtonVisible();
  assertExtensionsButtonTelemetry({ extensions_panel_showing: 1 });
  await closeExtensionsPanel();
  assertExtensionsButtonHidden();

  // No more counters besides the one that we saw before in this test.
  assertExtensionsButtonTelemetry({ extensions_panel_showing: 1 });

  await SpecialPowers.popPrefEnv();
});

// When the Extensions Button is visible, it used to open about:addons upon
// click, but now opens the extensions panel instead.
// Do the same when the Extensions app menu item is clicked.
// This behavior is the same as test_appmenu_extensions_opens_panel.
add_task(async function test_appmenu_extensions_opens_when_no_extensions() {
  // The test harness registers regular extensions so we need to mock the
  // `getActivePolicies` extension to simulate zero extensions installed.
  const origGetActivePolicies = gUnifiedExtensions.getActivePolicies;
  gUnifiedExtensions.getActivePolicies = () => [];

  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [["extensions.unifiedExtensions.button.always_visible", false]],
  });
  await gCUITestUtils.openMainMenu();

  assertExtensionsButtonHidden();
  menuItemThatOpensExtensionsPanel().click();
  is(PanelUI.panel.state, "closed", "Menu closed after clicking Extensions");
  // assertExtensionsButtonVisible(); cannot be checked because button showing
  // is async. We will check its visibility later, before closing the panel.

  Assert.deepEqual(
    Glean.extensionsButton.openViaAppMenu.testGetValue().map(e => e.extra),
    [
      {
        is_extensions_panel_empty: "true",
        is_extensions_button_visible: "false",
      },
    ],
    "extensions_button.open_via_app_menu telemetry on menu click"
  );

  const listView = getListView();
  await BrowserTestUtils.waitForEvent(listView, "ViewShown");
  ok(PanelView.forNode(listView).active, "Extensions panel is shown");

  // Sanity check to verify that the extensions list was indeed empty, by
  // verifying that the empty state is shown. The content of the panel is
  // verified by browser_unified_extensions_empty_panel.js.
  const emptyStateBox = gUnifiedExtensions.panel.querySelector(
    "#unified-extensions-empty-state"
  );
  ok(emptyStateBox, "Got container for empty panel state");
  ok(BrowserTestUtils.isVisible(emptyStateBox), "Empty state is visible");
  is(
    emptyStateBox.querySelector("h2").getAttribute("data-l10n-id"),
    "unified-extensions-empty-reason-zero-extensions-onboarding",
    "Has header when the user does not have any extensions installed"
  );

  assertExtensionsButtonVisible();
  assertExtensionsButtonTelemetry({ extensions_panel_showing: 1 });
  await closeExtensionsPanel();
  assertExtensionsButtonHidden();

  // No more counters besides the one that we saw before in this test.
  assertExtensionsButtonTelemetry({ extensions_panel_showing: 1 });

  await SpecialPowers.popPrefEnv();

  gUnifiedExtensions.getActivePolicies = origGetActivePolicies;
});

// A hidden Extensions Button can temporarily be shown when an attention dot is
// shown.
add_task(async function test_appmenu_extensions_with_attention_dot() {
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      // Attention dot is shown when MV3 permissions are not granted, so
      // prevent auto-granting of permissions on install.
      ["extensions.originControls.grantByDefault", false],
      ["extensions.unifiedExtensions.button.always_visible", false],
    ],
  });

  const extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "temporary",
    manifest: {
      browser_specific_settings: { gecko: { id: "test@attention-dot" } },
      manifest_version: 3,
      host_permissions: ["https://example.com/*"],
    },
  });
  await extension.startup();

  // Trigger attention dot and open the appmenu item. The attention dot has
  // more tests in browser_unified_extensions_button_visibility_attention.js.
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com/?test-attention-dot" },
    async () => {
      assertExtensionsButtonVisible();
      await gCUITestUtils.openMainMenu();
      menuItemThatOpensExtensionsPanel().click();
      const listView = getListView();
      await BrowserTestUtils.waitForEvent(listView, "ViewShown");
      ok(PanelView.forNode(listView).active, "Extensions panel is shown");
      await closeExtensionsPanel();
      assertExtensionsButtonVisible();
    }
  );

  Assert.deepEqual(
    Glean.extensionsButton.openViaAppMenu.testGetValue().map(e => e.extra),
    [
      {
        is_extensions_panel_empty: "false",
        is_extensions_button_visible: "true",
      },
    ],
    "extensions_button.open_via_app_menu telemetry on menu click"
  );

  await extension.unload();
  await SpecialPowers.popPrefEnv();
});
