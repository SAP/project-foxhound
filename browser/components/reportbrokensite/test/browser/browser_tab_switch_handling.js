/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Tests to ensure that Report Broken Site popups will be
 * reset to whichever tab the user is on as they change
 * between windows and tabs. */

"use strict";

add_common_setup();

add_task(async function testResetsProperlyOnTabSwitch() {
  ensureReportBrokenSitePreffedOn();

  await withNewTab("about:blank", async (_, badTab) => {
    await withNewTab(REPORTABLE_PAGE_URL, async (__, goodTab1) => {
      await withNewTab(REPORTABLE_PAGE_URL2, async () => {
        const appMenu = AppMenu();
        const protPanel = ProtectionsPanel();

        let rbs = await appMenu.openReportBrokenSite();
        rbs.isProperlyReset();
        rbs.close();

        gBrowser.selectedTab = goodTab1;

        rbs = await protPanel.openReportBrokenSite();
        rbs.isProperlyReset();
        rbs.close();

        gBrowser.selectedTab = badTab;
        await appMenu.open();
        appMenu.isReportBrokenSiteDisabled();
        await appMenu.close();

        gBrowser.selectedTab = goodTab1;
        rbs = await protPanel.openReportBrokenSite();
        rbs.isProperlyReset();
        rbs.close();
      });
    });
  });
});

add_task(async function testResetsProperlyOnWindowSwitch() {
  ensureReportBrokenSitePreffedOn();

  await withNewTab(REPORTABLE_PAGE_URL, async (win1, tab1) => {
    await withNewTab(
      { url: REPORTABLE_PAGE_URL2, window: null },
      async (win2, tab2) => {
        const appMenu1 = AppMenu(win1);
        const appMenu2 = ProtectionsPanel(win2);

        let rbs2 = await appMenu2.openReportBrokenSite();
        rbs2.isProperlyReset();
        rbs2.close();

        // flip back to tab1's window and ensure its URL pops up instead of tab2's URL
        await switchToWindow(win1);
        isSelectedTab(win1, tab1); // sanity check

        let rbs1 = await appMenu1.openReportBrokenSite();
        rbs1.isProperlyReset();
        rbs1.close();

        // likewise flip back to tab2's window and ensure its URL pops up instead of tab1's URL
        await switchToWindow(win2);
        isSelectedTab(win2, tab2); // sanity check

        rbs2 = await appMenu2.openReportBrokenSite();
        rbs2.isProperlyReset();
        rbs2.close();
      }
    );
  });
});
