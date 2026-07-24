/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/places/tests/browser/head.js",
  this
);
/* globals getToolbarNodeForItemGuid, promiseSetToolbarVisibility,
           promiseLibrary, promiseLibraryClosed, synthesizeClickOnSelectedTreeCell */

add_setup(async () => {
  await PlacesUtils.bookmarks.eraseEverything();

  let toolbar = document.getElementById("PersonalToolbar");
  await promiseSetToolbarVisibility(toolbar, true);
  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
    await promiseSetToolbarVisibility(toolbar, false);
  });
});

add_task(async function test_webnavigation_bookmark_toolbar_click_transition() {
  const testUrl = "https://example.com/?q=bookmark_toolbar";
  let bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    url: testUrl,
    title: "Test Bookmark",
  });

  function backgroundScript() {
    browser.webNavigation.onCommitted.addListener(msg => {
      if (!msg.url.includes("bookmark_toolbar")) {
        return;
      }

      browser.test.assertEq(
        "https://example.com/?q=bookmark_toolbar",
        msg.url,
        "Got the expected url"
      );

      browser.test.assertEq(
        "auto_bookmark",
        msg.transitionType,
        "Got the expected auto_bookmark transitionType"
      );

      browser.test.notifyPass("webNavigation.bookmark_click.auto_bookmark");
    });

    browser.test.sendMessage("ready");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: ["webNavigation"],
    },
  });

  await extension.startup();
  await SimpleTest.promiseFocus(window);
  await extension.awaitMessage("ready");

  // Ensure that the tab where the navigation happens has fully loaded
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  let toolbarNode = getToolbarNodeForItemGuid(bookmark.guid);
  ok(toolbarNode, "Found the bookmark in the toolbar");

  let loadedPromise = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    testUrl
  );

  EventUtils.synthesizeMouseAtCenter(toolbarNode, {});

  await loadedPromise;
  await extension.awaitFinish("webNavigation.bookmark_click.auto_bookmark");

  BrowserTestUtils.removeTab(tab);
  await extension.unload();
});

add_task(async function test_webnavigation_bookmark_library_click_transition() {
  const testUrl = "https://example.com/?q=bookmark_library";
  let bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    url: testUrl,
    title: "Test Bookmark Library",
  });

  let library = await promiseLibrary("UnfiledBookmarks");

  function backgroundScript() {
    browser.webNavigation.onCommitted.addListener(msg => {
      if (!msg.url.includes("bookmark_library")) {
        return;
      }

      browser.test.assertEq(
        "https://example.com/?q=bookmark_library",
        msg.url,
        "Got the expected url"
      );

      browser.test.assertEq(
        "auto_bookmark",
        msg.transitionType,
        "Got the expected auto_bookmark transitionType"
      );

      browser.test.notifyPass("webNavigation.library_bookmark.auto_bookmark");
    });

    browser.test.sendMessage("ready");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: ["webNavigation"],
    },
  });

  await extension.startup();
  await extension.awaitMessage("ready");

  library.ContentTree.view.selectItems([bookmark.guid]);
  let bmNode = library.ContentTree.view.selectedNode;
  Assert.equal(bmNode.title, bookmark.title, "Found bookmark in library");

  let loadedPromise = BrowserTestUtils.browserLoaded(
    gBrowser.selectedBrowser,
    false,
    testUrl
  );

  synthesizeClickOnSelectedTreeCell(library.ContentTree.view, {
    clickCount: 2,
  });

  await loadedPromise;
  await extension.awaitFinish("webNavigation.library_bookmark.auto_bookmark");

  await promiseLibraryClosed(library);
  await extension.unload();
});

add_task(
  async function test_webnavigation_bookmark_toolbar_new_tab_transition() {
    const testUrl = "https://example.com/?q=bookmark_new_tab";
    let bookmark = await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      url: testUrl,
      title: "Test Bookmark New Tab",
    });

    function backgroundScript() {
      browser.webNavigation.onCommitted.addListener(msg => {
        if (!msg.url.includes("bookmark_new_tab")) {
          return;
        }

        browser.test.assertEq(
          "https://example.com/?q=bookmark_new_tab",
          msg.url,
          "Got the expected url"
        );

        browser.test.assertEq(
          "auto_bookmark",
          msg.transitionType,
          "Got the expected auto_bookmark transitionType for new tab"
        );

        browser.test.notifyPass("webNavigation.bookmark_new_tab.auto_bookmark");
      });

      browser.test.sendMessage("ready");
    }

    let extension = ExtensionTestUtils.loadExtension({
      background: backgroundScript,
      manifest: {
        permissions: ["webNavigation"],
      },
    });

    await extension.startup();
    await SimpleTest.promiseFocus(window);
    await extension.awaitMessage("ready");

    let toolbarNode = getToolbarNodeForItemGuid(bookmark.guid);
    ok(toolbarNode, "Found the bookmark in the toolbar");

    let newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser, testUrl, true);

    EventUtils.synthesizeMouseAtCenter(toolbarNode, { button: 1 });

    let newTab = await newTabPromise;
    await extension.awaitFinish("webNavigation.bookmark_new_tab.auto_bookmark");

    BrowserTestUtils.removeTab(newTab);
    await extension.unload();
  }
);

add_task(async function test_webnavigation_open_all_in_tabs_transition() {
  const testUrl1 = "https://example.com/?q=folder_bookmark_1";
  const testUrl2 = "https://example.com/?q=folder_bookmark_2";
  const testUrl3 = "https://example.com/?q=folder_bookmark_3";

  let folder = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    type: PlacesUtils.bookmarks.TYPE_FOLDER,
    title: "Test Folder",
  });

  await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: testUrl1,
    title: "Folder Bookmark 1",
  });
  await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: testUrl2,
    title: "Folder Bookmark 2",
  });
  await PlacesUtils.bookmarks.insert({
    parentGuid: folder.guid,
    url: testUrl3,
    title: "Folder Bookmark 3",
  });

  function backgroundScript() {
    let checkedCount = 0;

    browser.webNavigation.onCommitted.addListener(msg => {
      if (!msg.url.includes("folder_bookmark_")) {
        return;
      }

      browser.test.assertEq(
        "auto_bookmark",
        msg.transitionType,
        `Got auto_bookmark transitionType for ${msg.url}`
      );

      checkedCount++;
      if (checkedCount === 3) {
        browser.test.notifyPass("webNavigation.open_all_in_tabs.auto_bookmark");
      }
    });

    browser.test.sendMessage("ready");
  }

  let extension = ExtensionTestUtils.loadExtension({
    background: backgroundScript,
    manifest: {
      permissions: ["webNavigation"],
    },
  });

  await extension.startup();
  await SimpleTest.promiseFocus(window);
  await extension.awaitMessage("ready");

  let folderNode = getToolbarNodeForItemGuid(folder.guid);
  ok(folderNode, "Found the folder in the toolbar");

  let placesContext = document.getElementById("placesContext");
  let contextMenuPromise = BrowserTestUtils.waitForEvent(
    placesContext,
    "popupshown"
  );

  EventUtils.synthesizeMouseAtCenter(folderNode, {
    button: 2,
    type: "contextmenu",
  });

  await contextMenuPromise;

  // Wait for the tabs to open with waitForAnyTab=true so each promise finds its matching URL regardless of open order
  let tabPromise1 = BrowserTestUtils.waitForNewTab(
    gBrowser,
    testUrl1,
    false,
    true
  );
  let tabPromise2 = BrowserTestUtils.waitForNewTab(
    gBrowser,
    testUrl2,
    false,
    true
  );
  let tabPromise3 = BrowserTestUtils.waitForNewTab(
    gBrowser,
    testUrl3,
    false,
    true
  );

  let openAllInTabs = document.getElementById(
    "placesContext_openBookmarkContainer:tabs"
  );
  placesContext.activateItem(openAllInTabs);

  let [tab1, tab2, tab3] = await Promise.all([
    tabPromise1,
    tabPromise2,
    tabPromise3,
  ]);

  await extension.awaitFinish("webNavigation.open_all_in_tabs.auto_bookmark");

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab3);

  await extension.unload();
});

add_task(
  async function test_reload_not_affected_by_bookmark_opened_in_new_tab() {
    const testUrl = "https://example.com/?q=reload_test";
    const bookmarkUrl = "https://example.com/?q=bookmark_other_tab";

    let bookmark = await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      url: bookmarkUrl,
      title: "Test Bookmark Other Tab",
    });

    function backgroundScript() {
      browser.webNavigation.onCommitted.addListener(msg => {
        if (msg.url.includes("reload_test")) {
          browser.test.sendMessage("reload_transition", msg.transitionType);
        } else if (msg.url.includes("bookmark_other_tab")) {
          browser.test.assertEq(
            "auto_bookmark",
            msg.transitionType,
            "Bookmark opened in new tab should have auto_bookmark transition"
          );
          browser.test.sendMessage("bookmark_navigation_received");
        }
      });

      browser.test.sendMessage("ready");
    }

    let extension = ExtensionTestUtils.loadExtension({
      background: backgroundScript,
      manifest: {
        permissions: ["webNavigation"],
      },
    });

    await extension.startup();
    await SimpleTest.promiseFocus(window);
    await extension.awaitMessage("ready");

    // Load a non-bookmark URL in a new tab
    let initialTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      testUrl
    );
    await extension.awaitMessage("reload_transition");

    // Open bookmark in a new tab
    let toolbarNode = getToolbarNodeForItemGuid(bookmark.guid);
    ok(toolbarNode, "Found the bookmark in the toolbar");

    let newTabPromise = BrowserTestUtils.waitForNewTab(
      gBrowser,
      bookmarkUrl,
      true
    );

    EventUtils.synthesizeMouseAtCenter(toolbarNode, { button: 1 });

    let newTab = await newTabPromise;
    await extension.awaitMessage("bookmark_navigation_received");

    // Go back to the original tab and reload
    gBrowser.selectedTab = initialTab;

    let reloadPromise = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      testUrl
    );

    gBrowser.selectedBrowser.reload();
    await reloadPromise;

    // Make sure that the reload transition is "reload", not "auto_bookmark"
    let reloadTransition = await extension.awaitMessage("reload_transition");

    Assert.equal(
      reloadTransition,
      "reload",
      "Reload should have 'reload' transition, not 'auto_bookmark'"
    );

    BrowserTestUtils.removeTab(newTab);
    BrowserTestUtils.removeTab(initialTab);
    await extension.unload();
  }
);

add_task(
  async function test_javascript_url_bookmark_does_not_affect_reload_transition() {
    const testUrl = "https://example.com/?q=js_bookmark_test";

    let bookmark = await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      url: "javascript:void(0)",
      title: "JS Bookmark",
    });

    function backgroundScript() {
      browser.webNavigation.onCommitted.addListener(msg => {
        if (msg.url.includes("js_bookmark_test")) {
          browser.test.sendMessage("navigation_transition", msg.transitionType);
        }
      });

      browser.test.sendMessage("ready");
    }

    let extension = ExtensionTestUtils.loadExtension({
      background: backgroundScript,
      manifest: {
        permissions: ["webNavigation"],
      },
    });

    await extension.startup();
    await SimpleTest.promiseFocus(window);
    await extension.awaitMessage("ready");

    // Load a website in a new tab
    let initialTab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      testUrl
    );
    await extension.awaitMessage("navigation_transition");

    // Click the non-navigating javascript: bookmark in the toolbar
    let toolbarNode = getToolbarNodeForItemGuid(bookmark.guid);
    ok(toolbarNode, "Found the javascript: bookmark in the toolbar");

    EventUtils.synthesizeMouseAtCenter(toolbarNode, {});

    let reloadPromise = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      testUrl
    );

    // Reload the current tab
    gBrowser.selectedBrowser.reload();
    await reloadPromise;

    // Ensure that the reload transition is "reload", not "auto_bookmark"
    let reloadTransition = await extension.awaitMessage(
      "navigation_transition"
    );

    Assert.equal(
      reloadTransition,
      "reload",
      "Reload after clicking javascript: bookmark should have 'reload' transition, not 'auto_bookmark'"
    );

    BrowserTestUtils.removeTab(initialTab);
    await extension.unload();
  }
);
