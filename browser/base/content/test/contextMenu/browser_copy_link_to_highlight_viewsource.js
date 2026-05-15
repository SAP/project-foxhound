/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PAGE =
  "data:text/html,<p id='p'>lorem&nbsp;ipsum&nbsp;dolor&nbsp;sit&nbsp;amet</p>";

add_task(async function copyLinkHiddenInViewSource() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);

  const viewSrcURI = "view-source:" + TEST_PAGE;
  const viewTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    viewSrcURI
  );
  const browser = viewTab.linkedBrowser;

  await SpecialPowers.spawn(browser, [], () => {
    const sel = content.getSelection();
    sel.removeAllRanges();
    const range = content.document.createRange();
    range.selectNodeContents(content.document.body);
    sel.addRange(range);
  });

  const contextMenu = document.getElementById("contentAreaContextMenu");
  const popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "pre",
    { type: "contextmenu", button: 2 },
    browser
  );
  await popupShown;

  ok(
    contextMenu.querySelector("#context-copy-link-to-highlight").hidden,
    "Copy Link to Highlight is hidden in view-source"
  );
  ok(
    contextMenu.querySelector("#context-copy-clean-link-to-highlight").hidden,
    "Copy Clean Link to Highlight is hidden in view-source"
  );

  const popupHidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await popupHidden;
  BrowserTestUtils.removeTab(viewTab);
  BrowserTestUtils.removeTab(tab);
});
