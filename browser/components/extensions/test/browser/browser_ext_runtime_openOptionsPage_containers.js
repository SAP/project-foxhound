"use strict";

async function loadExtension() {
  let extension = ExtensionTestUtils.loadExtension({
    useAddonManager: "temporary",

    manifest: {
      browser_specific_settings: {
        gecko: { id: "custom_container@tests.mozilla.org" },
      },
      options_ui: {
        page: "options.html",
        open_in_tab: true,
      },
    },

    files: {
      "options.html": `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <script src="options.js" type="text/javascript"></script>
          </head>
        </html>`,

      "options.js": function () {
        window.onload = () => browser.test.sendMessage("options-page-opened");
      },
    },

    background: async function () {
      browser.test.onMessage.addListener(async msg => {
        if (msg === "openOptionsPage") {
          await browser.runtime.openOptionsPage();
        }
      });
      browser.test.sendMessage("ready");
    },
  });

  await extension.startup();

  return extension;
}

add_task(async function test_options_page_loads_in_blank_tab() {
  info("Test openOptionsPage() replaces blank default non-container tab");

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:home");

  let extension = await loadExtension();

  await extension.awaitMessage("ready");
  extension.sendMessage("openOptionsPage");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  await extension.awaitMessage("options-page-opened");

  let optionsURL = `moz-extension://${extension.uuid}/options.html`;
  is(
    tab.linkedBrowser.currentURI.spec,
    optionsURL,
    "Tab navigated to options page"
  );
  is(gBrowser.selectedTab, tab, "Tab is active");

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
});

add_task(
  async function test_options_page_loads_in_new_tab_from_custom_container() {
    info(
      "Test openOptionsPage() loads in a new non-container tab, ignoring existing tab in container"
    );

    await SpecialPowers.pushPrefEnv({
      set: [["privacy.userContext.enabled", true]],
    });

    let tab = BrowserTestUtils.addTab(gBrowser, "about:home", {
      userContextId: 1,
    });
    gBrowser.selectedTab = tab;
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

    let extension = await loadExtension();

    await extension.awaitMessage("ready");
    let tabOpened = BrowserTestUtils.waitForNewTab(gBrowser);
    extension.sendMessage("openOptionsPage");

    await extension.awaitMessage("options-page-opened");

    let optionsTab = await tabOpened;
    let optionsURL = `moz-extension://${extension.uuid}/options.html`;
    isnot(optionsTab, tab, "Options page opened in a new tab");

    is(
      tab.linkedBrowser.currentURI.spec,
      "about:home",
      "Original container tab remains unchanged"
    );
    is(
      optionsTab.linkedBrowser.currentURI.spec,
      optionsURL,
      "Options tab has correct URL"
    );
    is(
      optionsTab.userContextId,
      0,
      "Options tab opened in the default non-container tab"
    );

    BrowserTestUtils.removeTab(tab);
    BrowserTestUtils.removeTab(optionsTab);
    await SpecialPowers.popPrefEnv();
    await extension.unload();
  }
);
