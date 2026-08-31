"use strict";

add_task(async function test_actions_context_menu() {
  function background() {
    browser.contextMenus.create({
      title: "open_browser_action",
      contexts: ["all"],
      command: "_execute_browser_action",
    });
    browser.contextMenus.create({
      title: "open_page_action",
      contexts: ["all"],
      command: "_execute_page_action",
    });
    browser.contextMenus.create({
      title: "open_sidebar_action",
      contexts: ["all"],
      command: "_execute_sidebar_action",
    });
    browser.tabs.onUpdated.addListener(tabId => {
      browser.pageAction.show(tabId);
    });
    browser.contextMenus.onClicked.addListener(() => {
      browser.test.fail(`menu onClicked should not have been received`);
    });
    browser.test.sendMessage("ready");
  }

  function testScript() {
    browser.test.log(`testScript executing on ${window.location.href}\n`);
    window.onload = () => {
      browser.test.sendMessage("test-opened", true);
    };
  }

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: "contextMenus commands",
      permissions: ["contextMenus", "activeTab", "tabs"],
      browser_action: {
        default_title: "Test BrowserAction",
        default_popup: "test.html?type=browserAction",
        browser_style: true,
      },
      page_action: {
        default_title: "Test PageAction",
        default_popup: "test.html?type=pageAction",
        browser_style: true,
      },
      sidebar_action: {
        default_title: "Test Sidebar",
        default_panel: "test.html?type=sidebarAction",
        open_at_install: false,
      },
    },
    background,
    files: {
      "test.html": `<!DOCTYPE html><meta charset="utf-8"><script src="test.js"></script>`,
      "test.js": testScript,
    },
  });

  async function testContext(id) {
    const menu = await openExtensionContextMenu();
    const items = menu.getElementsByAttribute("label", id);
    is(items.length, 1, `exactly one menu item found`);
    info(`await on closeExtensionContextMenu for ${id}`);
    await closeExtensionContextMenu(items[0]);
    info(`await on test-opened test message for ${id}`);
    return extension.awaitMessage("test-opened");
  }

  await extension.startup();
  await extension.awaitMessage("ready");

  // open a page so page action works
  const PAGE =
    "http://mochi.test:8888/browser/browser/components/extensions/test/browser/context.html?test=commands";
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE);

  ok(
    await testContext("open_sidebar_action"),
    "_execute_sidebar_action worked"
  );
  ok(
    await testContext("open_browser_action"),
    "_execute_browser_action worked"
  );
  ok(await testContext("open_page_action"), "_execute_page_action worked");

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
});

add_task(async function test_v3_action_context_menu() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      name: "contextMenus commands",
      manifest_version: 3,
      permissions: ["contextMenus"],
      action: {
        default_title: "Test Action",
        default_popup: "test.html",
        // TODO bug 1830712: Remove this. Probably not even needed for the test.
        browser_style: true,
      },
    },
    background() {
      browser.contextMenus.onClicked.addListener(() => {
        browser.test.fail(`menu onClicked should not have been received`);
      });

      browser.contextMenus.create(
        {
          id: "open_action",
          title: "open_action",
          contexts: ["all"],
          command: "_execute_action",
        },
        () => {
          browser.test.sendMessage("ready");
        }
      );
    },
    files: {
      "test.html": `<!DOCTYPE html><meta charset="utf-8"><script src="test.js"></script>`,
      "test.js": () => {
        window.onload = () => {
          browser.test.sendMessage("test-opened", true);
        };
      },
    },
  });

  async function testContext(id) {
    const menu = await openContextMenu();
    const items = menu.getElementsByAttribute("label", id);
    is(items.length, 1, `exactly one menu item found`);
    await closeExtensionContextMenu(items[0]);
    return extension.awaitMessage("test-opened");
  }

  await extension.startup();
  await extension.awaitMessage("ready");

  const PAGE =
    "http://mochi.test:8888/browser/browser/components/extensions/test/browser/context.html?test=commands";
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, PAGE);

  ok(await testContext("open_action"), "_execute_action worked");

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
});
