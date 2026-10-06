/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_about_translations_app_menu_entry() {
  const { cleanup } = await loadTestPage({
    page: ENGLISH_PAGE_URL,
    languagePairs: LANGUAGE_PAIRS,
  });

  const panelShownPromise = BrowserTestUtils.waitForEvent(
    window.PanelUI.panel,
    "popupshown"
  );
  window.PanelUI.show();

  await panelShownPromise;

  const moreToolsShownPromise = BrowserTestUtils.waitForEvent(
    window.PanelMultiView.getViewNode(document, "appmenu-moreTools"),
    "ViewShown"
  );
  document.getElementById("appMenu-more-button2").click();

  await moreToolsShownPromise;

  const openTabPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    url => url.startsWith("about:translations"),
    true
  );
  const panelHiddenPromise = BrowserTestUtils.waitForEvent(
    window.PanelUI.panel,
    "popuphidden"
  );

  window.PanelMultiView.getViewNode(
    document,
    "appmenu-abouttranslations-button"
  ).click();

  await panelHiddenPromise;

  const tab = await openTabPromise;
  const url = new URL(tab.linkedBrowser.currentURI.spec);
  const hashParameters = new URLSearchParams(url.hash.slice(1));

  is(
    hashParameters.get("trg"),
    "en",
    "The app menu item opens about:translations with the preferred target language."
  );

  BrowserTestUtils.removeTab(tab);

  await cleanup();
});
