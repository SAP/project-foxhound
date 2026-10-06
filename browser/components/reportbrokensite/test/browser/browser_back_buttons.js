/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Tests to ensure that Report Broken Site popups will be
 * reset to whichever tab the user is on as they change
 * between windows and tabs. */

"use strict";

add_common_setup();

add_task(async function testBackButtonsAreAdded() {
  ensureReportBrokenSitePreffedOn();

  await withNewTab(REPORTABLE_PAGE_URL, async () => {
    let rbs = await AppMenu().openReportBrokenSite();
    await rbs.clickBack();
    await rbs.close();

    rbs = await HelpMenu().openReportBrokenSite();
    ok(!rbs.backButton, "Back button is not shown for Help Menu");
    await rbs.close();

    rbs = await ProtectionsPanel().openReportBrokenSite();
    await rbs.clickBack();
    await rbs.close();

    rbs = await HelpMenu().openReportBrokenSite();
    ok(!rbs.backButton, "Back button is not shown for Help Menu");
    await rbs.close();
  });
});
