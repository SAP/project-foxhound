/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

add_task(async function setup() {
  // make sure userContext is enabled.
  return SpecialPowers.pushPrefEnv({
    set: [["privacy.userContext.enabled", true]],
  });
});

add_task(async function testLocalStorage() {
  async function background() {
    function waitForTabs() {
      return new Promise(resolve => {
        let tabs = [];

        let listener = async (msg, { tab }) => {
          if (msg !== "content-script-ready") {
            return;
          }

          tabs.push(tab);
          if (tabs.length == 3) {
            browser.runtime.onMessage.removeListener(listener);
            resolve(tabs);
          }
        };
        browser.runtime.onMessage.addListener(listener);
      });
    }

    function sendMessageToTabs(tabs, message) {
      return Promise.all(
        tabs.map(tab => {
          return browser.tabs.sendMessage(tab.id, message);
        })
      );
    }

    let tabs = await waitForTabs();

    browser.test.assertRejects(
      browser.browsingData.removeLocalStorage({ since: Date.now() }),
      "Firefox does not support clearing localStorage with 'since'.",
      "Expected error received when using unimplemented parameter 'since'."
    );

    await sendMessageToTabs(tabs, "resetLocalStorage");
    await browser.browsingData.removeLocalStorage({
      hostnames: ["example.com"],
    });
    await browser.tabs.sendMessage(tabs[0].id, "checkLocalStorageCleared");
    await browser.tabs.sendMessage(tabs[1].id, "checkLocalStorageSet");

    if (
      SpecialPowers.Services.domStorageManager.nextGenLocalStorageEnabled ===
      false
    ) {
      // This assertion fails when localStorage is using the legacy
      // implementation (See Bug 1595431).
      browser.test.log("Skipped assertion on nextGenLocalStorageEnabled=false");
    } else {
      await browser.tabs.sendMessage(tabs[2].id, "checkLocalStorageSet");
    }

    await sendMessageToTabs(tabs, "resetLocalStorage");
    await sendMessageToTabs(tabs, "checkLocalStorageSet");
    await browser.browsingData.removeLocalStorage({});
    await sendMessageToTabs(tabs, "checkLocalStorageCleared");

    await sendMessageToTabs(tabs, "resetLocalStorage");
    await sendMessageToTabs(tabs, "checkLocalStorageSet");
    await browser.browsingData.remove({}, { localStorage: true });
    await sendMessageToTabs(tabs, "checkLocalStorageCleared");

    // Can only delete cookieStoreId with LSNG enabled.
    if (SpecialPowers.Services.domStorageManager.nextGenLocalStorageEnabled) {
      await sendMessageToTabs(tabs, "resetLocalStorage");
      await sendMessageToTabs(tabs, "checkLocalStorageSet");
      await browser.browsingData.removeLocalStorage({
        cookieStoreId: "firefox-container-1",
      });
      await browser.tabs.sendMessage(tabs[0].id, "checkLocalStorageSet");
      await browser.tabs.sendMessage(tabs[1].id, "checkLocalStorageSet");
      await browser.tabs.sendMessage(tabs[2].id, "checkLocalStorageCleared");

      await sendMessageToTabs(tabs, "resetLocalStorage");
      await sendMessageToTabs(tabs, "checkLocalStorageSet");
      // Hostname doesn't match, so nothing cleared.
      await browser.browsingData.removeLocalStorage({
        cookieStoreId: "firefox-container-1",
        hostnames: ["example.net"],
      });
      await sendMessageToTabs(tabs, "checkLocalStorageSet");

      await sendMessageToTabs(tabs, "resetLocalStorage");
      await sendMessageToTabs(tabs, "checkLocalStorageSet");
      // Deleting private browsing mode data is silently ignored.
      await browser.browsingData.removeLocalStorage({
        cookieStoreId: "firefox-private",
      });
      await sendMessageToTabs(tabs, "checkLocalStorageSet");
    } else {
      await browser.test.assertRejects(
        browser.browsingData.removeLocalStorage({
          cookieStoreId: "firefox-container-1",
        }),
        "removeLocalStorage with cookieStoreId requires LSNG"
      );
    }

    // Cleanup (checkLocalStorageCleared creates empty LS databases).
    await browser.browsingData.removeLocalStorage({});

    await browser.tabs.remove(tabs.map(tab => tab.id));

    browser.test.notifyPass("done");
  }

  function contentScript() {
    browser.runtime.onMessage.addListener(msg => {
      if (msg === "resetLocalStorage") {
        localStorage.clear();
        localStorage.setItem("test", "test");
      } else if (msg === "checkLocalStorageSet") {
        browser.test.assertEq(
          "test",
          localStorage.getItem("test"),
          `checkLocalStorageSet: ${location.href}`
        );
      } else if (msg === "checkLocalStorageCleared") {
        browser.test.assertEq(
          null,
          localStorage.getItem("test"),
          `checkLocalStorageCleared: ${location.href}`
        );
      }
    });
    browser.runtime.sendMessage("content-script-ready");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background,
    manifest: {
      name: "Test Extension",
      permissions: ["browsingData"],
      content_scripts: [
        {
          matches: [
            "http://example.com/",
            "http://example.net/",
            "http://test1.example.com/",
          ],
          js: ["content-script.js"],
          run_at: "document_end",
        },
      ],
    },
    files: {
      "content-script.js": contentScript,
    },
  });

  await extension.startup();

  const TABS = [
    { url: "http://example.com" },
    { url: "http://example.net" },
    {
      url: "http://test1.example.com",
      options: {
        userContextId: 1,
      },
    },
  ];

  for (let info of TABS) {
    let tab = await BrowserTestUtils.addTab(gBrowser, info.url, info.options);
    let browser = gBrowser.getBrowserForTab(tab);
    await BrowserTestUtils.browserLoaded(browser);
  }

  await extension.awaitFinish("done");
  await extension.unload();
});

// Verify that browsingData.removeLocalStorage doesn't break on data stored
// in about:newtab or file principals.
add_task(async function test_browserData_on_aboutnewtab_and_file_data() {
  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      await browser.browsingData.removeLocalStorage({}).catch(err => {
        browser.test.fail(`${err} :: ${err.stack}`);
      });
      browser.test.sendMessage("done");
    },
    manifest: {
      permissions: ["browsingData"],
    },
  });

  // Let's create some data on about:newtab origin.
  const { SiteDataTestUtils } = ChromeUtils.import(
    "resource://testing-common/SiteDataTestUtils.jsm"
  );
  await SiteDataTestUtils.addToIndexedDB("about:newtab", "foo", "bar", {});
  await SiteDataTestUtils.addToIndexedDB("file:///fake/file", "foo", "bar", {});

  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
});

add_task(async function test_browserData_should_not_remove_extension_data() {
  if (!Services.prefs.getBoolPref("dom.storage.next_gen")) {
    // When LSNG isn't enabled, the browsingData API does still clear
    // all the extensions localStorage if called without a list of specific
    // origins to clear.
    info("Test skipped because LSNG is currently disabled");
    return;
  }

  let extension = ExtensionTestUtils.loadExtension({
    async background() {
      window.localStorage.setItem("key", "value");
      await browser.browsingData.removeLocalStorage({}).catch(err => {
        browser.test.fail(`${err} :: ${err.stack}`);
      });
      browser.test.sendMessage("done", window.localStorage.getItem("key"));
    },
    manifest: {
      permissions: ["browsingData"],
    },
  });

  await extension.startup();
  const lsValue = await extension.awaitMessage("done");
  is(lsValue, "value", "Got the expected localStorage data");
  await extension.unload();
});
