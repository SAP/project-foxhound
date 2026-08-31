/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Tests to ensure that sending or canceling reports with
 * the Send and Cancel buttons work (as well as the Okay button)
 */

"use strict";

add_common_setup();

requestLongerTimeout(2);

async function testPressingKeys(sequence) {
  await withNewTab(REPORTABLE_PAGE_URL, async () => {
    for (const menu of [AppMenu(), ProtectionsPanel(), HelpMenu()]) {
      info(
        `Opening RBS to test sequence ${JSON.stringify(sequence.map(s => s[0]))} on ${menu.menuDescription}`
      );
      const rbs = await menu.openReportBrokenSite();
      for (const [
        description,
        key,
        tabToMatch,
        makePromise,
        followUp,
      ] of sequence) {
        const promise = makePromise(rbs);
        if (tabToMatch) {
          info(`${description}: tabbing to ${tabToMatch}`);
          if (await rbs.tabTo(tabToMatch)) {
            info(`${description}: pressing ${key} and waiting for ${promise}`);
            await rbs.pressKeyAndAwait(promise, key);
            if (followUp) {
              info(`${description}: waiting for follow-up to resolve`);
              await followUp(rbs);
            }
            ok(true, description);
          } else {
            await rbs.close();
            ok(
              false,
              `${description}: could not tab to ${tabToMatch} to press ${key}`
            );
            return;
          }
        } else {
          info(`${description}: pressing ${key} and waiting for ${promise}`);
          await rbs.pressKeyAndAwait(promise, key);
          if (followUp) {
            info(`${description}: waiting for follow-up to resolve`);
            await followUp(rbs);
          }
          ok(true, `was able to press ${key}`);
        }
      }
      await rbs.close();
    }
  });
}

add_task(async function testSendMoreInfo() {
  ensureReportBrokenSitePreffedOn();
  enableSendMoreInfo();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "activate send more info",
      "KEY_Enter",
      "#report-broken-site-popup-send-more-info-button",
      rbs => rbs.waitForSendMoreInfoTab(),
      () => gBrowser.removeCurrentTab(),
    ],
  ]);
});

add_task(async function testDetailsCancel() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "press cancel",
      "KEY_Enter",
      "#report-broken-site-popup-details-cancel-button",
      rbs => rbs.waitForViewToHide(rbs.detailsView),
    ],
  ]);
});

add_task(async function testPreviewCancel() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "get to preview view",
      "KEY_Enter",
      "#report-broken-site-popup-preview-button",
      rbs => rbs.waitForViewToShow(rbs.previewView),
    ],
    [
      "press cancel",
      "KEY_Enter",
      "#report-broken-site-popup-preview-cancel-button",
      rbs => rbs.waitForViewToHide(rbs.previewView),
    ],
  ]);
});

add_task(async function testDetailsSend() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "press send button",
      "KEY_Enter",
      "#report-broken-site-popup-send-button",
      rbs => rbs.waitForViewToShow(rbs.sentView),
    ],
    [
      "press okay button",
      "KEY_Enter",
      "#report-broken-site-popup-okay-button",
      rbs => rbs.waitForViewToHide(rbs.sentView),
    ],
  ]);
});

add_task(async function testPreviewSend() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "get to preview view",
      "KEY_Enter",
      "#report-broken-site-popup-preview-button",
      rbs => rbs.waitForViewToShow(rbs.previewView),
    ],
    [
      "press send button",
      "KEY_Enter",
      "#report-broken-site-popup-preview-send-button",
      rbs => rbs.waitForViewToShow(rbs.sentView),
    ],
    [
      "press okay button",
      "KEY_Enter",
      "#report-broken-site-popup-okay-button",
      rbs => rbs.waitForViewToHide(rbs.sentView),
    ],
  ]);
});

add_task(async function testESCOnMain() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "close with escape",
      "KEY_Escape",
      null,
      rbs => rbs.waitForViewToHide(rbs.mainView),
    ],
  ]);
});

add_task(async function testESCOnDetails() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "close with escape",
      "KEY_Escape",
      "#report-broken-site-popup-details-cancel-button",
      rbs => rbs.waitForViewToHide(rbs.detailsView),
    ],
  ]);
});

add_task(async function testESCOnPreview() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "get to preview view",
      "KEY_Enter",
      "#report-broken-site-popup-preview-button",
      rbs => rbs.waitForViewToShow(rbs.previewView),
    ],
    [
      "close with escape",
      "KEY_Escape",
      "#report-broken-site-popup-preview-send-button",
      rbs => rbs.waitForViewToHide(rbs.previewView),
    ],
  ]);
});

add_task(async function testESCOnSent() {
  ensureReportBrokenSitePreffedOn();
  await testPressingKeys([
    [
      "get to details view",
      "KEY_Enter",
      "#report-broken-site-popup-reason-load",
      rbs => rbs.waitForViewToShow(rbs.detailsView),
    ],
    [
      "press send button",
      "KEY_Enter",
      "#report-broken-site-popup-send-button",
      rbs => rbs.waitForViewToShow(rbs.sentView),
    ],
    [
      "close with escape",
      "KEY_Escape",
      "#report-broken-site-popup-okay-button",
      rbs => rbs.waitForViewToHide(rbs.sentView),
    ],
  ]);
});

add_task(async function testBackButtons() {
  ensureReportBrokenSitePreffedOn();
  await withNewTab(REPORTABLE_PAGE_URL, async () => {
    for (const menu of [AppMenu(), ProtectionsPanel(), HelpMenu()]) {
      const rbs = await menu.openReportBrokenSiteToDetailsPanel();
      await rbs.clickPreview();

      await rbs.tabTo(
        "#report-broken-site-popup-previewView .subviewbutton-back"
      );
      await rbs.pressKeyAndAwait(
        rbs.waitForViewToShow(rbs.detailsView),
        "KEY_Enter"
      );

      await rbs.tabTo(
        "#report-broken-site-popup-detailsView .subviewbutton-back"
      );
      await rbs.pressKeyAndAwait(
        rbs.waitForViewToShow(rbs.mainView),
        "KEY_Enter"
      );

      if (menu.menuDescription == "Help Menu") {
        ok(!rbs.backButton, "Help menu main panel has no back button");
      } else {
        await rbs.tabTo(
          "#report-broken-site-popup-mainView .subviewbutton-back"
        );
        await rbs.pressKeyAndAwait(
          rbs.waitForViewToHide(rbs.mainView),
          "KEY_Enter"
        );
      }

      await rbs.close();
    }
  });
});
