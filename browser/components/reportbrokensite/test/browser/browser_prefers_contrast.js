/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Test that the background color of the "report sent"
 * view is not green in non-default contrast modes.
 */

"use strict";

add_common_setup();

const HIGH_CONTRAST_MODE_OFF = [[PREFS.USE_ACCESSIBILITY_THEME, 0]];

const HIGH_CONTRAST_MODE_ON = [[PREFS.USE_ACCESSIBILITY_THEME, 1]];

add_task(async function testReportSentViewBGColor() {
  ensureReportBrokenSitePreffedOn();

  await withNewTab(REPORTABLE_PAGE_URL, async win => {
    const { defaultView } = win.document;

    const menu = AppMenu();

    await SpecialPowers.pushPrefEnv({ set: HIGH_CONTRAST_MODE_OFF });
    let rbs = await menu.openReportBrokenSiteToDetailsPanel();
    const { mainView, sentView } = rbs;
    mainView.style.backgroundColor = "var(--background-color-success)";
    const expectedReportSentBGColor =
      defaultView.getComputedStyle(mainView).backgroundColor;
    mainView.style.backgroundColor = "";
    const expectedPrefersReducedBGColor =
      defaultView.getComputedStyle(mainView).backgroundColor;

    await rbs.clickSend();
    is(
      defaultView.getComputedStyle(sentView).backgroundColor,
      expectedReportSentBGColor,
      "Using green bgcolor when not prefers-contrast"
    );
    await rbs.clickOkay();

    await SpecialPowers.pushPrefEnv({ set: HIGH_CONTRAST_MODE_ON });
    rbs = await menu.openReportBrokenSiteToDetailsPanel();
    await rbs.clickSend();
    is(
      defaultView.getComputedStyle(sentView).backgroundColor,
      expectedPrefersReducedBGColor,
      "Using default bgcolor when prefers-contrast"
    );
    await rbs.clickOkay();
  });
});
