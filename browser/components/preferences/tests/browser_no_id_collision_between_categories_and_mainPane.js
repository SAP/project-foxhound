/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
/*
 * Bug 1983388 - Ensure focus isn't lost when navigating categories via keyboard.
 * By checking that there are no elements in the document with an ID that is the
 * same value as the category values, focus will not move from the richlistbox.
 * */
add_task(async function test_no_category_values_as_markup_ids() {
  await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });

  let categories = gBrowser.contentDocument.getElementById("categories");

  let categoryValues = categories.itemChildren.map(elem => {
    return gBrowser.contentWindow.internalPrefCategoryNameToFriendlyName(
      elem.value
    );
  });

  for (let value of categoryValues) {
    ok(
      !gBrowser.contentDocument.getElementById(value),
      `There should be no markup with id: ${value}`
    );
  }

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
