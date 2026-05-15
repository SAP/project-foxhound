"use strict";

add_task(async function test_show_search_term_tooltip_in_subdialog() {
  await openPreferencesViaOpenPreferencesAPI("paneGeneral", {
    leaveOpen: true,
  });

  let keyword = "organization";
  await runSearchInput(keyword);

  let addressesGroup = gBrowser.contentDocument.querySelector(
    "setting-group[groupid=addresses]"
  );
  let savedAddressesButton = addressesGroup.querySelector(
    "#savedAddressesButton"
  );

  info("Clicking saved addresses button to open subdialog");
  savedAddressesButton.click();
  info("Waiting for addresses subdialog to appear");
  await BrowserTestUtils.waitForCondition(() => {
    let dialogBox = gBrowser.contentDocument.querySelector(".dialogBox");
    return !!dialogBox;
  });
  let tooltip = gBrowser.contentDocument.querySelector(".search-tooltip");

  is_element_visible(
    tooltip,
    "Tooltip with search term should be visible in subdialog"
  );
  is(tooltip.textContent, keyword, "Tooltip should have correct search term");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
