/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const ADDON_ID = "tabliss-test@example.com";
const ADDON_NAME = "Tabliss";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(async function test_extension_url_label_updates_on_extension_unload() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: ADDON_NAME,
      browser_specific_settings: { gecko: { id: ADDON_ID } },
    },
    useAddonManager: "permanent",
  });
  await extension.startup();

  let policy = WebExtensionPolicy.getByID(ADDON_ID);
  ok(policy, "Test extension policy is registered");
  let extensionURL = policy.getURL("page.html");

  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, `${extensionURL}|https://example.com`]],
  });

  let { doc, tab } = await openCustomHomepageSubpage();

  await BrowserTestUtils.waitForCondition(
    () => doc.querySelectorAll("moz-box-item[data-url]").length === 2,
    "Wait for both URLs to render"
  );

  let extItem = doc.querySelector('moz-box-item[data-url^="moz-extension://"]');
  is(
    extItem.getAttribute("label"),
    `Extension (${ADDON_NAME})`,
    "Initial label shows the friendly extension name"
  );

  // Unload the extension. The AddonManager listener wired up in
  // customHomepageBoxGroup's setup() should trigger a re-render, falling
  // back to the raw URL spec now that the policy is no longer registered.
  await extension.unload();

  await BrowserTestUtils.waitForCondition(
    () =>
      doc
        .querySelector('moz-box-item[data-url^="moz-extension://"]')
        ?.getAttribute("label") === `Extension (${extensionURL})`,
    "Wait for label to fall back to raw URL after extension unload"
  );

  BrowserTestUtils.removeTab(tab);
});
