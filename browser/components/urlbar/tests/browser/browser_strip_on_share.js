/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let listService;

// Tests for the strip on share functionality of the urlbar.

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.query_stripping.strip_list", "stripParam"],
      ["privacy.query_stripping.enabled", false],
    ],
  });

  // Get the list service so we can wait for it to be fully initialized before running tests.
  listService = Cc["@mozilla.org/query-stripping-list-service;1"].getService(
    Ci.nsIURLQueryStrippingListService
  );

  await listService.testWaitForInit();
});

// Selection is not a valid URI, menu item should be hidden
add_task(async function testInvalidURI() {
  await testMenuItemDisabled({
    url: "https://www.example.com/?stripParam=1234",
    prefEnabled: true,
    selection: true,
  });
});

// Pref is not enabled, menu item should be hidden
add_task(async function testPrefDisabled() {
  await testMenuItemDisabled({
    url: "https://www.example.com/?stripParam=1234",
    prefEnabled: false,
    selection: false,
  });
});

// Menu item should be visible, the whole url is copied without a selection, url should be stripped.
add_task(async function testQueryParamIsStripped() {
  let originalUrl = "https://www.example.com/?stripParam=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: false,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: false,
    expectedDisabled: false,
  });
});

// Menu item should be visible, selecting the whole url, url should be stripped.
add_task(async function testQueryParamIsStrippedSelectURL() {
  let originalUrl = "https://www.example.com/?stripParam=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: false,
    expectedDisabled: false,
  });
});

// Make sure other parameters don't interfere with stripping
add_task(async function testQueryParamIsStrippedWithOtherParam() {
  let originalUrl = "https://www.example.com/?keepParameter=1&stripParam=1234";
  let shortenedUrl = "https://www.example.com/?keepParameter=1";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: false,
    expectedDisabled: false,
  });
});

// Test that menu item becomes visible again after selecting a non-url
add_task(async function testQueryParamIsStrippedAfterInvalid() {
  // Selection is not a valid URI, menu item should be hidden
  await testMenuItemDisabled({
    url: "https://www.example.com/?stripParam=1234",
    prefEnabled: true,
    selection: true,
  });
  // test if menu item is visible after it getting hidden
  let originalUrl = "https://www.example.com/?stripParam=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: false,
    expectedDisabled: false,
  });
});

// Menu item should be disabled if url is the same.
add_task(async function testURLIsCopiedWithNoParams() {
  let originalUrl = "https://www.example.com/";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: false,
    expectedDisabled: true,
  });
});

// Testing site specific parameter stripping
add_task(async function testQueryParamIsStrippedForSiteSpecific() {
  let originalUrl = "https://www.example.com/?test_2=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: true,
    expectedDisabled: false,
  });
});

// Ensuring site specific parameters are not stripped for other sites
add_task(async function testQueryParamIsNotStrippedForWrongSiteSpecific() {
  let originalUrl = "https://www.example.com/?test_3=1234";
  let shortenedUrl = "https://www.example.com/?test_3=1234";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: true,
    expectedDisabled: true,
  });
});

// Ensuring site specific parameters are stripped regardless
// of capitalization in the URI
add_task(async function testQueryParamIsStrippedWhenParamIsCapitalized() {
  let originalUrl = "https://www.example.com/?TEST_1=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: true,
    expectedDisabled: false,
  });
});

// Ensuring site specific parameters are stripped regardless
// of capitalization in the URI
add_task(async function testQueryParamIsStrippedWhenParamIsLowercase() {
  let originalUrl = "https://www.example.com/?test_5=1234";
  let shortenedUrl = "https://www.example.com/";
  await testMenuItemEnabled({
    selectWholeUrl: true,
    validUrl: originalUrl,
    strippedUrl: shortenedUrl,
    useTestList: true,
    expectedDisabled: false,
  });
});

/**
 * Opens a new tab and checks menu item is hidden in the url bar context menu.
 *
 * @param {object} options
 * @param {string} options.url - The url to be loaded.
 * @param {boolean} options.prefEnabled - If true, enable strip_on_share pref.
 * @param {boolean} options.selection - If true, select only part of the url.
 */
async function testMenuItemDisabled({ url, prefEnabled, selection }) {
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.query_stripping.strip_on_share.enabled", prefEnabled]],
  });

  await BrowserTestUtils.withNewTab(url, async function () {
    gURLBar.focus();
    if (selection) {
      //select only part of the url
      gURLBar.selectionStart = url.indexOf("example");
      gURLBar.selectionEnd = url.indexOf("4");
    }

    await UrlbarTestUtils.withContextMenu(window, async popup => {
      let mozInputBox = popup.parentNode;
      let menuitem = mozInputBox.getMenuItem("strip-on-share");
      Assert.ok(
        !BrowserTestUtils.isVisible(menuitem),
        "Menu item is not visible"
      );
    });
  });
}

/**
 * Opens a new tab and checks menu item is visible in the url bar context menu.
 * Checks that the stripped version of the url is copied to the clipboard.
 *
 * @param {object} options
 * @param {boolean} options.selectWholeUrl - If true, select the whole url.
 * @param {string} options.validUrl - The original url before stripping.
 * @param {string} options.strippedUrl - The expected url after stripping.
 * @param {boolean} options.useTestList - If true, use test mode pref and list.
 * @param {boolean} options.expectedDisabled - The expected iten disabled state.
 */
async function testMenuItemEnabled({
  selectWholeUrl,
  validUrl,
  strippedUrl,
  useTestList,
  expectedDisabled,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.query_stripping.strip_on_share.enabled", true],
      ["privacy.query_stripping.strip_on_share.enableTestMode", useTestList],
    ],
  });

  if (useTestList) {
    let testJson = {
      global: {
        queryParams: ["utm_ad"],
        isGlobal: true,
      },
      example: {
        queryParams: ["test_2", "test_1", "TEST_5"],
        origins: ["www.example.com"],
      },
      exampleNet: {
        queryParams: ["test_3", "test_4"],
        origins: ["www.example.net"],
      },
    };

    await listService.testSetList(testJson);
  }

  await BrowserTestUtils.withNewTab(validUrl, async function () {
    gURLBar.focus();
    if (selectWholeUrl) {
      gURLBar.select();
    }

    // Make sure the clean copy of the link will be copied to the clipboard
    await SimpleTest.promiseClipboardChange(strippedUrl, async () => {
      await UrlbarTestUtils.withContextMenu(window, async popup => {
        let mozInputBox = popup.parentNode;
        let menuitem = mozInputBox.getMenuItem("strip-on-share");
        Assert.ok(BrowserTestUtils.isVisible(menuitem), "Menu item is visible");
        Assert.equal(
          menuitem.disabled,
          expectedDisabled,
          "Menu item is disabled"
        );
        menuitem.closest("menupopup").activateItem(menuitem);
      });
    });
  });

  await SpecialPowers.popPrefEnv();
}
