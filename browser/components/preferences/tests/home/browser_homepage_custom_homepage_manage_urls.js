/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const FIVE_URLS =
  "https://a.com|https://b.com|https://c.com|https://d.com|https://e.com";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_deleting_custom_url() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        HOMEPAGE_PREF,
        "https://example.com|https://test.org|https://mozilla.org",
      ],
    ],
  });

  let { doc, tab } = await openCustomHomepageSubpage();

  await TestUtils.waitForCondition(
    () => doc.querySelectorAll("moz-box-item[data-url]").length === 3,
    "Wait for all URLs to render"
  );

  let boxItems = doc.querySelectorAll("moz-box-item[data-url]");
  let secondItem = Array.from(boxItems).find(
    item => item.getAttribute("data-url") === "https://test.org"
  );
  ok(secondItem, "Found the test.org item");

  let deleteButton = secondItem.querySelector(
    "moz-button[data-action='delete']"
  );
  ok(deleteButton, "Delete button exists on the item");

  deleteButton.click();

  await TestUtils.waitForCondition(
    () =>
      Services.prefs.getStringPref(HOMEPAGE_PREF) ===
      "https://example.com|https://mozilla.org",
    "Pref updated after deletion"
  );

  await TestUtils.waitForCondition(
    () => doc.querySelectorAll("moz-box-item[data-url]").length === 2,
    "Wait for list to update"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_custom_urls() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        HOMEPAGE_PREF,
        "https://example.com|https://test.org|https://mozilla.org",
      ],
    ],
  });

  let { win, tab } = await openCustomHomepageSubpage();

  let boxGroupControl = await settingControlRenders(
    "customHomepageBoxGroup",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder =
    "https://test.org|https://mozilla.org|https://example.com";
  let prefChanged = TestUtils.waitForPrefChange(HOMEPAGE_PREF);

  let dragItem = boxGroup.querySelector('[data-url="https://example.com"]');
  let targetItem = boxGroup.querySelector('[data-url="https://mozilla.org"]');

  performDragAndDrop({
    contentWindow: win,
    dragItem: dragItem.handleEl,
    targetItem,
    position: "after",
  });

  Assert.equal(await prefChanged, expectedOrder, "Pref updated with new order");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_custom_urls_position_before() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, FIVE_URLS]],
  });

  let { win, tab } = await openCustomHomepageSubpage();

  let boxGroupControl = await settingControlRenders(
    "customHomepageBoxGroup",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder =
    "https://b.com|https://c.com|https://d.com|https://a.com|https://e.com";
  let prefChanged = TestUtils.waitForPrefChange(HOMEPAGE_PREF);

  // Simulate dropping https://a.com (index 0) before https://e.com (index 4).
  // The indicator shows between d.com and e.com; the item must land there.
  let dragItem = boxGroup.querySelector('[data-url="https://a.com"]');
  let targetItem = boxGroup.querySelector('[data-url="https://e.com"]');
  performDragAndDrop({
    contentWindow: win,
    dragItem: dragItem.handleEl,
    targetItem,
    position: "before",
  });

  Assert.equal(
    await prefChanged,
    expectedOrder,
    "a.com should land between d.com and e.com"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_custom_urls_position_after_from_end() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, FIVE_URLS]],
  });

  let { win, tab } = await openCustomHomepageSubpage();

  let boxGroupControl = await settingControlRenders(
    "customHomepageBoxGroup",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder =
    "https://a.com|https://b.com|https://e.com|https://c.com|https://d.com";
  let prefChanged = TestUtils.waitForPrefChange(HOMEPAGE_PREF);

  // Simulate dropping https://e.com (index 4) after https://b.com (index 1).
  let dragItem = boxGroup.querySelector('[data-url="https://e.com"]');
  let targetItem = boxGroup.querySelector('[data-url="https://b.com"]');
  performDragAndDrop({
    contentWindow: win,
    dragItem: dragItem.handleEl,
    targetItem,
    position: "after",
  });

  Assert.equal(
    await prefChanged,
    expectedOrder,
    "e.com should land after b.com"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_reordering_custom_urls_position_before_from_end() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, FIVE_URLS]],
  });

  let { win, tab } = await openCustomHomepageSubpage();

  let boxGroupControl = await settingControlRenders(
    "customHomepageBoxGroup",
    win
  );
  let boxGroup = boxGroupControl.controlEl;

  let expectedOrder =
    "https://a.com|https://e.com|https://b.com|https://c.com|https://d.com";
  let prefChanged = TestUtils.waitForPrefChange(HOMEPAGE_PREF);

  // Simulate dropping https://e.com (index 4) before https://b.com (index 1).
  let dragItem = boxGroup.querySelector('[data-url="https://e.com"]');
  let targetItem = boxGroup.querySelector('[data-url="https://b.com"]');
  performDragAndDrop({
    contentWindow: win,
    dragItem: dragItem.handleEl,
    targetItem,
    position: "before",
  });

  Assert.equal(
    await prefChanged,
    expectedOrder,
    "e.com should land before b.com"
  );

  await BrowserTestUtils.removeTab(tab);
});
