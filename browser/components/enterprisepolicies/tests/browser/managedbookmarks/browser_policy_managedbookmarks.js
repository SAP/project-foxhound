/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { getMozRemoteImageURL } = ChromeUtils.importESModule(
  "moz-src:///toolkit/modules/FaviconUtils.sys.mjs"
);

add_task(async function test_policy_managedbookmarks() {
  let managedBookmarksMenu =
    window.document.getElementById("managed-bookmarks");

  is(
    managedBookmarksMenu.hidden,
    false,
    "Managed bookmarks button should be visible."
  );
  is(
    managedBookmarksMenu.label,
    "Folder 1",
    "Managed bookmarks buttons should have correct label"
  );

  let popupShownPromise = BrowserTestUtils.waitForEvent(
    managedBookmarksMenu.menupopup,
    "popupshown",
    false
  );
  let popupHiddenPromise = BrowserTestUtils.waitForEvent(
    managedBookmarksMenu.menupopup,
    "popuphidden",
    false
  );
  managedBookmarksMenu.open = true;
  await popupShownPromise;

  is(
    managedBookmarksMenu.menupopup.children[0].label,
    "Bookmark 1",
    "Bookmark should have correct label"
  );
  is(
    managedBookmarksMenu.menupopup.children[0].link,
    "https://example.com/",
    "Bookmark should have correct link"
  );
  is(
    managedBookmarksMenu.menupopup.children[1].label,
    "Bookmark 2",
    "Bookmark should have correct label"
  );
  is(
    managedBookmarksMenu.menupopup.children[1].link,
    "https://bookmark2.example.com/",
    "Bookmark should have correct link"
  );
  let subFolder = managedBookmarksMenu.menupopup.children[2];
  is(subFolder.label, "Folder 2", "Subfolder should have correct label");
  is(
    subFolder.menupopup.children[0].label,
    "Bookmark 3",
    "Bookmark should have correct label"
  );
  is(
    subFolder.menupopup.children[0].link,
    "https://bookmark3.example.com/",
    "Bookmark should have correct link"
  );
  is(
    subFolder.menupopup.children[1].label,
    "Bookmark 4",
    "Bookmark should have correct link"
  );
  is(
    subFolder.menupopup.children[1].link,
    "https://bookmark4.example.com/",
    "Bookmark should have correct label"
  );
  subFolder = managedBookmarksMenu.menupopup.children[3];
  await TestUtils.waitForCondition(() => {
    // Need to wait for Fluent to translate
    return subFolder.label == "Subfolder";
  }, "Subfolder should have correct label");
  is(
    subFolder.menupopup.children[0].label,
    "Bookmark 5",
    "Bookmark should have correct label"
  );
  is(
    subFolder.menupopup.children[0].link,
    "https://bookmark5.example.com/",
    "Bookmark should have correct link"
  );
  is(
    subFolder.menupopup.children[1].label,
    "Bookmark 6",
    "Bookmark should have correct link"
  );
  is(
    subFolder.menupopup.children[1].link,
    "https://bookmark6.example.com/",
    "Bookmark should have correct label"
  );

  managedBookmarksMenu.open = false;
  await popupHiddenPromise;
});

add_task(async function test_managedbookmark_entry_types() {
  let managedBookmarksMenu =
    window.document.getElementById("managed-bookmarks");

  await BrowserTestUtils.withNewTab(
    "https://example.com/",
    async function (browser) {
      let popupShown = BrowserTestUtils.waitForEvent(
        managedBookmarksMenu.menupopup,
        "popupshown",
        false
      );
      managedBookmarksMenu.open = true;
      await popupShown;

      let bookmark7 = managedBookmarksMenu.menupopup.children[4];
      let expectedFavicon = getMozRemoteImageURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=",
        { size: 16 }
      );
      is(
        bookmark7.getAttribute("image"),
        expectedFavicon,
        "Bookmark with explicit favicon should use a moz-remote-image: wrapping it"
      );

      let schemeless = managedBookmarksMenu.menupopup.querySelector(
        'menuitem[label="Schemeless"]'
      );
      ok(schemeless, "Scheme-less bookmark menuitem should exist");
      is(
        schemeless.link,
        "https://schemeless.example.com/",
        "Scheme-less URL should be prefixed with https://"
      );

      let invalid = managedBookmarksMenu.menupopup.querySelector(
        'menuitem[label="Invalid"]'
      );
      ok(!invalid, "Bookmark with invalid URL should be skipped");

      let bookmarklet = managedBookmarksMenu.menupopup.querySelector(
        'menuitem[label="Bookmarklet"]'
      );
      ok(bookmarklet, "Bookmarklet menuitem should exist");
      is(
        bookmarklet.link,
        "javascript:document.title='bookmarklet ran';void(0)",
        "Bookmarklet link should preserve javascript: URL unchanged"
      );

      let popupHidden = BrowserTestUtils.waitForEvent(
        managedBookmarksMenu.menupopup,
        "popuphidden"
      );
      managedBookmarksMenu.menupopup.activateItem(bookmarklet);
      await popupHidden;
      await TestUtils.waitForCondition(
        () => browser.contentTitle == "bookmarklet ran",
        "Bookmarklet should have executed and set the title"
      );
    }
  );
});

add_task(async function test_open_managedbookmark() {
  let managedBookmarksMenu =
    window.document.getElementById("managed-bookmarks");

  let promise = BrowserTestUtils.waitForEvent(
    managedBookmarksMenu.menupopup,
    "popupshown",
    false
  );
  managedBookmarksMenu.open = true;
  await promise;

  let context = document.getElementById("placesContext");
  let openContextMenuPromise = BrowserTestUtils.waitForEvent(
    context,
    "popupshown"
  );
  EventUtils.synthesizeMouseAtCenter(
    managedBookmarksMenu.menupopup.children[0],
    {
      button: 2,
      type: "contextmenu",
    }
  );
  await openContextMenuPromise;
  info("Opened context menu");

  ok(
    document.getElementById("placesContext_open:newprivatewindow").hidden,
    "Private Browsing menu should be hidden"
  );
  ok(
    document.getElementById("placesContext_openContainer:tabs").hidden,
    "Open in Tabs should be hidden"
  );
  ok(
    document.getElementById("placesContext_delete").hidden,
    "Delete should be hidden"
  );

  let tabCreatedPromise = BrowserTestUtils.waitForNewTab(gBrowser, null, true);

  let openInNewTabOption = document.getElementById("placesContext_open:newtab");
  context.activateItem(openInNewTabOption);
  info("Click open in new tab");

  let lastOpenedTab = await tabCreatedPromise;
  Assert.equal(
    lastOpenedTab.linkedBrowser.currentURI.spec,
    "https://example.com/",
    "Should have opened the correct URI"
  );
  await BrowserTestUtils.removeTab(lastOpenedTab);
});

add_task(async function test_copy_managedbookmark() {
  let managedBookmarksMenu =
    window.document.getElementById("managed-bookmarks");

  let promise = BrowserTestUtils.waitForEvent(
    managedBookmarksMenu.menupopup,
    "popupshown",
    false
  );
  managedBookmarksMenu.open = true;
  await promise;

  let context = document.getElementById("placesContext");
  let openContextMenuPromise = BrowserTestUtils.waitForEvent(
    context,
    "popupshown"
  );
  EventUtils.synthesizeMouseAtCenter(
    managedBookmarksMenu.menupopup.children[0],
    {
      button: 2,
      type: "contextmenu",
    }
  );
  await openContextMenuPromise;
  info("Opened context menu");

  let copyOption = document.getElementById("placesContext_copy");

  await new Promise((resolve, reject) => {
    SimpleTest.waitForClipboard(
      "https://example.com/",
      () => {
        context.activateItem(copyOption);
      },
      resolve,
      () => {
        ok(false, "Clipboard copy failed");
        reject();
      }
    );
  });

  let popupHidden = BrowserTestUtils.waitForEvent(
    managedBookmarksMenu.menupopup,
    "popuphidden"
  );
  managedBookmarksMenu.menupopup.hidePopup();
  await popupHidden;
});
