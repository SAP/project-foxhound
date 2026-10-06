// Test ability to focus search field by using keyboard
"use strict";

add_task(async function () {
  await openTabAndSetupStorage(MAIN_URL_SECURED + "storage-search.html");

  gUI.tree.expandAll();
  await selectTreeItem(["localStorage", MAIN_ORIGIN_SECURED]);

  await focusSearchBoxUsingShortcut(gPanelWindow);
  ok(
    containsFocus(gPanelWindow.document, gUI.searchBox),
    "Focus is in a searchbox"
  );
});
