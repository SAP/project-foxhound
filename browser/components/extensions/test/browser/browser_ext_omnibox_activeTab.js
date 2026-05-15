/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const keyword = "VeryUniqueKeywordThatDoesNeverMatchAnyTestUrl";

add_task(async function test_omnibox_input_entered_with_activeTab() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      browser_specific_settings: { gecko: { id: "user-interaction@omnibox" } },
      omnibox: {
        keyword: keyword,
      },
      permissions: ["activeTab"],
    },

    async background() {
      browser.omnibox.onInputEntered.addListener(async () => {
        let [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        browser.test.assertEq(
          "https://example.com/",
          tab.url,
          "tab.url has the expected url"
        );
        await browser.tabs.insertCSS(tab.id, {
          code: "body { border: 20px solid red; }",
        });
        browser.test.sendMessage("onInputEntered");
      });

      browser.test.sendMessage("ready");
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");

  let ext = WebExtensionPolicy.getByID(extension.id).extension;
  is(
    ext.tabManager.hasActiveTabPermission(tab),
    false,
    "Active tab was not granted permission"
  );

  gURLBar.focus();
  gURLBar.value = keyword;
  EventUtils.sendString(" ");
  EventUtils.synthesizeKey("KEY_Enter");
  await extension.awaitMessage("onInputEntered");

  is(
    ext.tabManager.hasActiveTabPermission(tab),
    true,
    "Active tab was granted permission"
  );
  await extension.unload();

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_omnibox_input_entered_without_activeTab() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "permanent",
    manifest: {
      browser_specific_settings: { gecko: { id: "user-interaction@omnibox" } },
      omnibox: {
        keyword: keyword,
      },
    },

    async background() {
      browser.omnibox.onInputEntered.addListener(async () => {
        let [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        browser.test.assertEq(tab.url, undefined, "tab.url is undefined");
        await browser.test.assertRejects(
          browser.tabs.insertCSS(tab.id, {
            code: "body { border: 20px solid red; }",
          }),
          "Missing host permission for the tab",
          "expected failure of tabs.insertCSS without permission"
        );
        browser.test.sendMessage("onInputEntered");
      });

      browser.test.sendMessage("ready");
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");

  gURLBar.focus();
  gURLBar.value = keyword;
  EventUtils.sendString(" ");
  EventUtils.synthesizeKey("KEY_Enter");
  await extension.awaitMessage("onInputEntered");

  await extension.unload();

  BrowserTestUtils.removeTab(tab);
});
