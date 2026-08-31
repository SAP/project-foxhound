/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Tests to ensure that sending or canceling reports with
 * the Send and Cancel buttons work (as well as the Okay button)
 */

/* import-globals-from send.js */

"use strict";

Services.scriptloader.loadSubScript(
  getRootDirectory(gTestPath) + "send.js",
  this
);

add_common_setup();

requestLongerTimeout(10);

async function testCancel(menu, url, description) {
  let rbs = await menu.openReportBrokenSiteToDetailsPanel({ url, description });
  await rbs.clickCancel();
  ok(!rbs.opened, "clicking Cancel closes Report Broken Site");

  // re-opening the panel, the url and description should be reset
  rbs = await menu.openReportBrokenSite();
  rbs.isProperlyReset();
  rbs.close();
}

add_task(async function testSendButton() {
  ensureReportBrokenSitePreffedOn();
  enableScreenshots();

  await withNewTab(REPORTABLE_PAGE_URL, async (_, tab1) => {
    await withNewTab(REPORTABLE_PAGE_URL, async (__, tab2) => {
      // send one report without a screenshot, and confirm the toggle resets for the next report.
      await testSend(tab1, AppMenu(), {
        toggleOffScreenshot: true,
      });

      // also confirm that less data is sent if hostname is changed.
      await testSend(tab2, ProtectionsPanel(), {
        url: "https://test.org/test/#fake",
        breakageCategory: "media",
        description: "test description",
        expectNoTabDetails: true,
      });

      // confirm a full send
      await testSend(tab1, AppMenu());
    });
  });
});

add_task(async function testCancelButton() {
  ensureReportBrokenSitePreffedOn();

  await withNewTab(REPORTABLE_PAGE_URL, async () => {
    await testCancel(AppMenu());
    await testCancel(ProtectionsPanel());
    await testCancel(HelpMenu());

    await withNewTab(REPORTABLE_PAGE_URL, async () => {
      await testCancel(AppMenu());
      await testCancel(ProtectionsPanel());
      await testCancel(HelpMenu());

      await withNewTab(
        { url: REPORTABLE_PAGE_URL2, window: null },
        async win2 => {
          await testCancel(AppMenu(win2));
          await testCancel(ProtectionsPanel(win2));
          await testCancel(HelpMenu(win2));
        }
      );
    });
  });
});
