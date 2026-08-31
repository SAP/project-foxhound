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

add_task(
  async function test_extension_url_shows_friendly_name_in_custom_list() {
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

    let boxItems = Array.from(doc.querySelectorAll("moz-box-item[data-url]"));

    let extItem = boxItems.find(item =>
      item.getAttribute("data-url")?.startsWith("moz-extension://")
    );
    ok(extItem, "Found the extension URL item");
    is(
      extItem.getAttribute("label"),
      `Extension (${ADDON_NAME})`,
      "Extension URL item shows the friendly extension name"
    );

    let regItem = boxItems.find(
      item => item.getAttribute("data-url") === "https://example.com"
    );
    ok(regItem, "Found the regular URL item");
    is(
      regItem.getAttribute("label"),
      "example.com",
      "Regular URL item shows the host as the label"
    );

    // The extension item is the only kind without a `label` attribute, so
    // this confirms deleting still works when the item is identified by URL
    // rather than label.
    let deleteButton = extItem.querySelector(
      "moz-button[data-action='delete']"
    );
    ok(deleteButton, "Delete button exists on the extension URL item");
    deleteButton.click();

    await TestUtils.waitForCondition(
      () =>
        Services.prefs.getStringPref(HOMEPAGE_PREF) === "https://example.com",
      "Pref drops the extension URL after delete"
    );

    await extension.unload();
    BrowserTestUtils.removeTab(tab);
  }
);
