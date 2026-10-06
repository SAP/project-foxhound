/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 *  Test removing bookmarks from the Bookmarks Toolbar and Library.
 */
const SECOND_BOOKMARK_TITLE = "Second Bookmark Title";
const bookmarksInfo = [
  {
    title: "firefox",
    url: "https://example.com",
  },
  {
    title: "rules",
    url: "https://example.com/2",
  },
  {
    title: "yo",
    url: "https://example.com/2",
  },
];
const TEST_URL = "about:mozilla";

XPCOMUtils.defineLazyPreferenceGetter(
  this,
  "userContextEnabled",
  "privacy.userContext.enabled"
);

async function waitForToolbarNode(guid, win = window) {
  let node;
  await BrowserTestUtils.waitForMutationCondition(
    win.document.getElementById("PlacesToolbarItems"),
    { childList: true },
    () => (node = getToolbarNodeForItemGuid(guid, win))
  );
  await TestUtils.waitForCondition(
    () => BrowserTestUtils.isVisible(node),
    "Waiting for toolbar node to be visible"
  );
  return node;
}

async function hidePopupAndWait(popup) {
  let hiddenPromise = BrowserTestUtils.waitForPopupEvent(popup, "hidden");
  popup.hidePopup();
  await hiddenPromise;
}

/**
 * Executes a task and awaits for the expected context menu panel to receive
 * the popupshown event, retries if it doesn't fire within a reasonable time.
 * TODO (Bug 2018551): this is a workaround for test failures where the
 * synthesized mouse event is apparently lost when this test is the first to run.
 *
 * @param {DOMElement} contextMenuPanel
 * @param {Function} openingFn
 * @returns {Promise<DOMElement>}
 */
async function openContextMenuWithRetry(contextMenuPanel, openingFn) {
  const attempts = 10;
  for (let i = 0; i < attempts; i++) {
    if (i > 0 && contextMenuPanel.state !== "closed") {
      await hidePopupAndWait(contextMenuPanel);
    }
    const popupPromise = new Promise(resolve => {
      function handler() {
        clearTimeout(timerId);
        contextMenuPanel.removeEventListener("popupshown", handler);
        resolve(true);
      }
      contextMenuPanel.addEventListener("popupshown", handler);
      // Wait for a timeout, then retry if the event didn't fire.
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      let timerId = setTimeout(() => {
        contextMenuPanel.removeEventListener("popupshown", handler);
        info(`popupshown did not fire in time, try ${i + 1} of ${attempts}`);
        resolve(false);
      }, 500);
    });
    await openingFn();
    if (await popupPromise) {
      break;
    }
  }
  return contextMenuPanel;
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });

  await PlacesUtils.bookmarks.eraseEverything();

  let toolbar = document.getElementById("PersonalToolbar");
  let wasCollapsed = toolbar.collapsed;

  // Uncollapse the personal toolbar if needed.
  if (wasCollapsed) {
    await promiseSetToolbarVisibility(toolbar, true);
  }

  registerCleanupFunction(async () => {
    // Collapse the personal toolbar if needed.
    if (wasCollapsed) {
      await promiseSetToolbarVisibility(toolbar, false);
    }
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

let OptionItemExists = (elementId, doc = document) => {
  let optionItem = doc.getElementById(elementId);

  Assert.ok(optionItem, `Context menu contains the menuitem ${elementId}`);
  Assert.ok(
    BrowserTestUtils.isVisible(optionItem),
    `Context menu option ${elementId} is visible`
  );
};

let OptionsMatchExpected = (contextMenu, expectedOptionItems) => {
  let idList = [];
  for (let elem of contextMenu.children) {
    if (
      BrowserTestUtils.isVisible(elem) &&
      elem.localName !== "menuseparator"
    ) {
      idList.push(elem.id);
    }
  }

  Assert.deepEqual(
    idList.sort(),
    expectedOptionItems.sort(),
    "Content is the same across both lists"
  );
};

let checkContextMenu = async (cbfunc, optionItems, doc = document) => {
  let bookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    title: SECOND_BOOKMARK_TITLE,
    url: TEST_URL,
  });

  await PlacesUtils.bookmarks.insertTree({
    guid: PlacesUtils.bookmarks.unfiledGuid,
    children: bookmarksInfo,
  });

  // Open and check the context menu twice, once with
  // `browser.tabs.loadBookmarksInTabs` set to true and again with it set to
  // false.
  for (let loadBookmarksInNewTab of [true, false]) {
    info(
      `Running checkContextMenu: ` + JSON.stringify({ loadBookmarksInNewTab })
    );

    await SpecialPowers.pushPrefEnv({
      set: [["browser.tabs.loadBookmarksInTabs", loadBookmarksInNewTab]],
    });

    // When `loadBookmarksInTabs` is true, the usual placesContext_open:newtab
    // item is hidden and placesContext_open is shown. The tasks in this test
    // assume that `loadBookmarksInTabs` is false, so when a caller expects
    // placesContext_open:newtab to appear but not placesContext_open, add it to
    // the list of expected items when the pref is set.
    let expectedOptionItems = [...optionItems];
    if (
      loadBookmarksInNewTab &&
      optionItems.includes("placesContext_open:newtab") &&
      !optionItems.includes("placesContext_open")
    ) {
      expectedOptionItems.push("placesContext_open");
    }

    // The caller is responsible for opening the menu, via `cbfunc()`.
    let contextMenu = await cbfunc(bookmark);

    for (let item of expectedOptionItems) {
      OptionItemExists(item, doc);
    }

    OptionsMatchExpected(contextMenu, expectedOptionItems);

    // Check the "default" attributes on placesContext_open and
    // placesContext_open:newtab.
    if (expectedOptionItems.includes("placesContext_open")) {
      Assert.equal(
        doc.getElementById("placesContext_open").getAttribute("default"),
        loadBookmarksInNewTab ? null : "true",
        `placesContext_open has the correct "default" attribute when loadBookmarksInTabs = ${loadBookmarksInNewTab}`
      );
    }
    if (expectedOptionItems.includes("placesContext_open:newtab")) {
      Assert.equal(
        doc.getElementById("placesContext_open:newtab").getAttribute("default"),
        loadBookmarksInNewTab ? "true" : null,
        `placesContext_open:newtab has the correct "default" attribute when loadBookmarksInTabs = ${loadBookmarksInNewTab}`
      );
    }

    await hidePopupAndWait(contextMenu);
    await SpecialPowers.popPrefEnv();
  }

  await PlacesUtils.bookmarks.eraseEverything();
};

add_task(async function test_bookmark_contextmenu_contents() {
  let optionItems = [
    "placesContext_open:newtab",
    "placesContext_open:newcontainertab",
    "placesContext_open:newwindow",
    "placesContext_open:newprivatewindow",
    "placesContext_show_bookmark:info",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
    "placesContext_showAllBookmarks",
    "toggle_PersonalToolbar",
    "show-other-bookmarks_PersonalToolbar",
  ];
  if (!userContextEnabled) {
    optionItems.splice(
      optionItems.indexOf("placesContext_open:newcontainertab"),
      1
    );
  }

  await checkContextMenu(async function () {
    let toolbarBookmark = await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      title: "Bookmark Title",
      url: TEST_URL,
    });

    let toolbarNode = await waitForToolbarNode(toolbarBookmark.guid);
    return openContextMenuWithRetry(
      document.getElementById("placesContext"),
      () => {
        EventUtils.synthesizeMouseAtCenter(
          toolbarNode,
          { button: 2, type: "contextmenu" },
          toolbarNode.documentGlobal
        );
      }
    );
  }, optionItems);

  let tabs = [];

  await checkContextMenu(async function () {
    info("Check context menu after opening context menu on content");
    const toolbarBookmark = await PlacesUtils.bookmarks.insert({
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      title: "Bookmark Title",
      url: TEST_URL,
    });

    let toolbarNode = await waitForToolbarNode(toolbarBookmark.guid);

    info("Open context menu on about:config");
    let tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      "about:config"
    );
    tabs.push(tab);
    const contextMenuOnContent = document.getElementById(
      "contentAreaContextMenu"
    );
    const popupShownPromiseOnContent = BrowserTestUtils.waitForEvent(
      contextMenuOnContent,
      "popupshown"
    );
    EventUtils.synthesizeMouseAtCenter(tab.linkedBrowser, {
      button: 2,
      type: "contextmenu",
    });
    await popupShownPromiseOnContent;
    await hidePopupAndWait(contextMenuOnContent);

    info("Check context menu on bookmark");
    return openContextMenuWithRetry(
      document.getElementById("placesContext"),
      () => {
        EventUtils.synthesizeMouseAtCenter(toolbarNode, {
          button: 2,
          type: "contextmenu",
        });
      }
    );
  }, optionItems);

  // We need to do a thorough cleanup to avoid leaking the window of
  // 'about:config'.
  for (let tab of tabs) {
    const tabClosed = BrowserTestUtils.waitForTabClosing(tab);
    BrowserTestUtils.removeTab(tab);
    await tabClosed;
  }
});

add_task(async function test_empty_contextmenu_contents() {
  let optionItems = [
    "placesContext_openBookmarkContainer:tabs",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
    "placesContext_paste",
    "placesContext_showAllBookmarks",
    "toggle_PersonalToolbar",
    "show-other-bookmarks_PersonalToolbar",
  ];

  await checkContextMenu(async function () {
    let contextMenu = document.getElementById("placesContext");
    let toolbar = document.querySelector("#PlacesToolbarItems");
    // Use the end of the toolbar because the beginning (and even middle, on
    // some resolutions) might be occluded by the empty toolbar message, which
    // has a different context menu.
    let bounds = toolbar.getBoundingClientRect();
    return openContextMenuWithRetry(contextMenu, () => {
      EventUtils.synthesizeMouse(toolbar, bounds.width - 5, 5, {
        type: "contextmenu",
      });
    });
  }, optionItems);
});

add_task(async function test_separator_contextmenu_contents() {
  let optionItems = [
    "placesContext_delete",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
    "placesContext_showAllBookmarks",
    "toggle_PersonalToolbar",
    "show-other-bookmarks_PersonalToolbar",
  ];

  await checkContextMenu(async function () {
    let sep = await PlacesUtils.bookmarks.insert({
      type: PlacesUtils.bookmarks.TYPE_SEPARATOR,
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    });

    let toolbarNode = await waitForToolbarNode(sep.guid);
    let contextMenu = document.getElementById("placesContext");
    return openContextMenuWithRetry(contextMenu, () => {
      EventUtils.synthesizeMouseAtCenter(toolbarNode, {
        button: 2,
        type: "contextmenu",
      });
    });
  }, optionItems);
});

add_task(async function test_folder_contextmenu_contents() {
  let optionItems = [
    "placesContext_openBookmarkContainer:tabs",
    "placesContext_show_folder:info",
    "placesContext_deleteFolder",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
    "placesContext_sortBy:name",
    "placesContext_showAllBookmarks",
    "toggle_PersonalToolbar",
    "show-other-bookmarks_PersonalToolbar",
  ];

  await checkContextMenu(async function () {
    let folder = await PlacesUtils.bookmarks.insert({
      type: PlacesUtils.bookmarks.TYPE_FOLDER,
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
    });

    let toolbarNode = await waitForToolbarNode(folder.guid);
    let contextMenu = document.getElementById("placesContext");
    return openContextMenuWithRetry(contextMenu, () => {
      EventUtils.synthesizeMouseAtCenter(toolbarNode, {
        button: 2,
        type: "contextmenu",
      });
    });
  }, optionItems);
});

add_task(async function test_sidebar_folder_contextmenu_contents() {
  let optionItems = [
    "placesContext_show_folder:info",
    "placesContext_deleteFolder",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_openBookmarkContainer:tabs",
    "placesContext_sortBy:name",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async () => {
        let folder = await PlacesUtils.bookmarks.insert({
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          title: "folder",
          type: PlacesUtils.bookmarks.TYPE_FOLDER,
        });

        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([folder.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_sidebar_multiple_folders_contextmenu_contents() {
  let optionItems = [
    "placesContext_show_folder:info",
    "placesContext_deleteFolder",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_sortBy:name",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async () => {
        let folder1 = await PlacesUtils.bookmarks.insert({
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          title: "folder 1",
          type: PlacesUtils.bookmarks.TYPE_FOLDER,
        });
        let folder2 = await PlacesUtils.bookmarks.insert({
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          title: "folder 2",
          type: PlacesUtils.bookmarks.TYPE_FOLDER,
        });

        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([folder1.guid, folder2.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_sidebar_bookmark_contextmenu_contents() {
  let optionItems = [
    "placesContext_open:newtab",
    "placesContext_open:newcontainertab",
    "placesContext_open:newwindow",
    "placesContext_open:newprivatewindow",
    "placesContext_show_bookmark:info",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];
  if (!userContextEnabled) {
    optionItems.splice(
      optionItems.indexOf("placesContext_open:newcontainertab"),
      1
    );
  }

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async bookmark => {
        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([bookmark.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_sidebar_bookmark_search_contextmenu_contents() {
  let optionItems = [
    "placesContext_open:newtab",
    "placesContext_open:newcontainertab",
    "placesContext_open:newwindow",
    "placesContext_open:newprivatewindow",
    "placesContext_showInFolder",
    "placesContext_show_bookmark:info",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
  ];
  if (!userContextEnabled) {
    optionItems.splice(
      optionItems.indexOf("placesContext_open:newcontainertab"),
      1
    );
  }

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async bookmark => {
        info("Checking bookmark sidebar menu contents in search context");
        // Perform a search first
        let searchBox =
          SidebarController.browser.contentDocument.getElementById(
            "search-box"
          );
        await setSearch(searchBox, SECOND_BOOKMARK_TITLE);

        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([bookmark.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_library_bookmark_contextmenu_contents() {
  let optionItems = [
    "placesContext_open",
    "placesContext_open:newtab",
    "placesContext_open:newcontainertab",
    "placesContext_open:newwindow",
    "placesContext_open:newprivatewindow",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];
  if (!userContextEnabled) {
    optionItems.splice(
      optionItems.indexOf("placesContext_open:newcontainertab"),
      1
    );
  }

  await withLibraryWindow("BookmarksToolbar", async ({ right }) => {
    await checkContextMenu(
      async bookmark => {
        let contextMenu = right.ownerDocument.getElementById("placesContext");
        return openContextMenuWithRetry(contextMenu, async () => {
          right.selectItems([bookmark.guid]);
          await synthesizeClickOnSelectedTreeCell(right, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      right.ownerDocument
    );
  });
});

add_task(async function test_library_bookmark_search_contextmenu_contents() {
  let optionItems = [
    "placesContext_open",
    "placesContext_open:newtab",
    "placesContext_open:newcontainertab",
    "placesContext_open:newwindow",
    "placesContext_open:newprivatewindow",
    "placesContext_showInFolder",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
  ];
  if (!userContextEnabled) {
    optionItems.splice(
      optionItems.indexOf("placesContext_open:newcontainertab"),
      1
    );
  }

  await withLibraryWindow("BookmarksToolbar", async ({ right }) => {
    await checkContextMenu(
      async bookmark => {
        info("Checking bookmark library menu contents in search context");
        // Perform a search first
        let searchBox = right.ownerDocument.getElementById("searchFilter");
        await setSearch(searchBox, SECOND_BOOKMARK_TITLE);

        let contextMenu = right.ownerDocument.getElementById("placesContext");
        return openContextMenuWithRetry(contextMenu, async () => {
          right.selectItems([bookmark.guid]);
          await synthesizeClickOnSelectedTreeCell(right, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      right.ownerDocument
    );
  });
});

add_task(async function test_sidebar_mixedselection_contextmenu_contents() {
  let optionItems = [
    "placesContext_delete",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async bookmark => {
        let folder = await PlacesUtils.bookmarks.insert({
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          title: "folder",
          type: PlacesUtils.bookmarks.TYPE_FOLDER,
        });

        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([bookmark.guid, folder.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_sidebar_multiple_bookmarks_contextmenu_contents() {
  let optionItems = [
    "placesContext_openBookmarkLinks:tabs",
    "placesContext_show_bookmark:info",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];

  await withSidebarTree("bookmarks", async tree => {
    await checkContextMenu(
      async bookmark => {
        let bookmark2 = await PlacesUtils.bookmarks.insert({
          url: "https://example.com/",
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
        });

        let contextMenu =
          SidebarController.browser.contentDocument.getElementById(
            "placesContext"
          );
        return openContextMenuWithRetry(contextMenu, async () => {
          tree.selectItems([bookmark.guid, bookmark2.guid]);
          await synthesizeClickOnSelectedTreeCell(tree, {
            type: "contextmenu",
          });
        });
      },
      optionItems,
      SidebarController.browser.contentDocument
    );
  });
});

add_task(async function test_sidebar_multiple_links_contextmenu_contents() {
  if (!Services.prefs.getBoolPref("sidebar.revamp", false)) {
    let optionItems = [
      "placesContext_openLinks:tabs",
      "placesContext_delete_history",
      "placesContext_copy",
      "placesContext_createBookmark",
    ];

    await withSidebarTree("history", async tree => {
      await checkContextMenu(
        async () => {
          await PlacesTestUtils.addVisits([
            "https://example-1.com/",
            "https://example-2.com/",
          ]);
          // Sort by last visited.
          tree.ownerDocument.getElementById("bylastvisited").doCommand();
          tree.selectAll();

          let contextMenu =
            SidebarController.browser.contentDocument.getElementById(
              "placesContext"
            );
          return openContextMenuWithRetry(contextMenu, async () => {
            await synthesizeClickOnSelectedTreeCell(tree, {
              type: "contextmenu",
            });
          });
        },
        optionItems,
        SidebarController.browser.contentDocument
      );
    });
  }
});

add_task(async function test_sidebar_mixed_bookmarks_contextmenu_contents() {
  if (!Services.prefs.getBoolPref("sidebar.revamp", false)) {
    let optionItems = [
      "placesContext_delete",
      "placesContext_cut",
      "placesContext_copy",
      "placesContext_paste_group",
      "placesContext_new:bookmark",
      "placesContext_new:folder",
      "placesContext_new:separator",
    ];

    await withSidebarTree("bookmarks", async tree => {
      await checkContextMenu(
        async bookmark => {
          let folder = await PlacesUtils.bookmarks.insert({
            type: PlacesUtils.bookmarks.TYPE_FOLDER,
            parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          });

          let contextMenu =
            SidebarController.browser.contentDocument.getElementById(
              "placesContext"
            );
          return openContextMenuWithRetry(contextMenu, async () => {
            tree.selectItems([bookmark.guid, folder.guid]);
            await synthesizeClickOnSelectedTreeCell(tree, {
              type: "contextmenu",
            });
          });
        },
        optionItems,
        SidebarController.browser.contentDocument
      );
    });
  }
});

add_task(async function test_library_noselection_contextmenu_contents() {
  let optionItems = [
    "placesContext_openBookmarkContainer:tabs",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
    "placesContext_paste",
  ];

  await withLibraryWindow("BookmarksToolbar", async ({ right }) => {
    await checkContextMenu(
      async () => {
        let contextMenu = right.ownerDocument.getElementById("placesContext");
        return openContextMenuWithRetry(contextMenu, async () => {
          right.selectItems([]);
          EventUtils.synthesizeMouseAtCenter(
            right.body,
            { type: "contextmenu" },
            right.documentGlobal
          );
        });
      },
      optionItems,
      right.ownerDocument
    );
  });
});

add_task(async function test_private_browsing_window() {
  // Test the context menu when in a private browsing window.

  let win = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let optionItems = [
    "placesContext_open:newtab",
    // Hidden in private window "placesContext_open:newcontainertab"
    // Hidden in private window "placesContext_open:newwindow"
    "placesContext_open:newprivatewindow",
    "placesContext_show_bookmark:info",
    "placesContext_deleteBookmark",
    "placesContext_cut",
    "placesContext_copy",
    "placesContext_paste_group",
    "placesContext_new:bookmark",
    "placesContext_new:folder",
    "placesContext_new:separator",
  ];

  // Test toolbar.
  await checkContextMenu(
    async function () {
      let toolbarBookmark = await PlacesUtils.bookmarks.insert({
        parentGuid: PlacesUtils.bookmarks.toolbarGuid,
        title: "Bookmark Title",
        url: TEST_URL,
      });

      let toolbarNode = await waitForToolbarNode(toolbarBookmark.guid, win);
      let contextMenu = win.document.getElementById("placesContext");
      return openContextMenuWithRetry(contextMenu, () => {
        EventUtils.synthesizeMouseAtCenter(
          toolbarNode,
          { button: 2, type: "contextmenu" },
          toolbarNode.documentGlobal
        );
      });
    },
    [
      ...optionItems,
      "placesContext_showAllBookmarks",
      "toggle_PersonalToolbar",
      "show-other-bookmarks_PersonalToolbar",
    ],
    win.document
  );

  // Test side bar.
  await withSidebarTree(
    "bookmarks",
    async tree => {
      await checkContextMenu(
        async bookmark => {
          let contextMenu =
            win.SidebarController.browser.contentDocument.getElementById(
              "placesContext"
            );
          return openContextMenuWithRetry(contextMenu, async () => {
            tree.selectItems([bookmark.guid]);
            await synthesizeClickOnSelectedTreeCell(tree, {
              type: "contextmenu",
            });
          });
        },
        optionItems,
        win.SidebarController.browser.contentDocument
      );
    },
    win
  );

  // Test library window opened when using private browsing window.
  optionItems.splice(
    optionItems.indexOf("placesContext_show_bookmark:info"),
    1
  );
  optionItems.splice(0, 0, "placesContext_open");

  await withLibraryWindow(
    "BookmarksToolbar",
    async ({ right }) => {
      await checkContextMenu(
        async bookmark => {
          let contextMenu = right.ownerDocument.getElementById("placesContext");
          return openContextMenuWithRetry(contextMenu, async () => {
            right.selectItems([bookmark.guid]);
            await synthesizeClickOnSelectedTreeCell(right, {
              type: "contextmenu",
            });
          });
        },
        optionItems,
        right.ownerDocument
      );
    },
    win
  );

  await BrowserTestUtils.closeWindow(win);
});
