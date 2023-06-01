/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the following data of engagement telemetry.
// - engagement_type

add_setup(async function() {
  await setup();
});

add_task(async function engagement_type_click() {
  await doTest(async browser => {
    await openPopup("x");
    await doClick();

    assertEngagementTelemetry([{ engagement_type: "click" }]);
  });
});

add_task(async function engagement_type_enter() {
  await doTest(async browser => {
    await openPopup("x");
    await doEnter();

    assertEngagementTelemetry([{ engagement_type: "enter" }]);
  });
});

add_task(async function engagement_type_drop_go() {
  await doTest(async browser => {
    await doDropAndGo("example.com");

    assertEngagementTelemetry([{ engagement_type: "drop_go" }]);
  });
});

add_task(async function engagement_type_paste_go() {
  await doTest(async browser => {
    await doPasteAndGo("www.example.com");

    assertEngagementTelemetry([{ engagement_type: "paste_go" }]);
  });
});

add_task(async function engagement_type_dismiss() {
  const cleanupQuickSuggest = await ensureQuickSuggestInit();

  for (const isBestMatchTest of [true, false]) {
    const prefs = isBestMatchTest
      ? [
          ["browser.urlbar.bestMatch.enabled", true],
          ["browser.urlbar.bestMatch.blockingEnabled", true],
          ["browser.urlbar.quicksuggest.blockingEnabled", false],
        ]
      : [
          ["browser.urlbar.bestMatch.enabled", false],
          ["browser.urlbar.bestMatch.blockingEnabled", false],
          ["browser.urlbar.quicksuggest.blockingEnabled", true],
        ];
    await SpecialPowers.pushPrefEnv({ set: prefs });

    await doTest(async browser => {
      await openPopup("sponsored");

      const originalResultCount = UrlbarTestUtils.getResultCount(window);
      await selectRowByURL("https://example.com/sponsored");
      if (UrlbarPrefs.get("resultMenu")) {
        UrlbarTestUtils.openResultMenuAndPressAccesskey(window, "D");
      } else {
        doClickSubButton(".urlbarView-button-block");
      }
      await BrowserTestUtils.waitForCondition(
        () => originalResultCount != UrlbarTestUtils.getResultCount(window)
      );

      if (UrlbarPrefs.get("resultMenu")) {
        todo(
          false,
          "telemetry for the result menu to be implemented in bug 1790020"
        );
      } else {
        assertEngagementTelemetry([{ engagement_type: "dismiss" }]);
      }
    });

    await doTest(async browser => {
      await openPopup("sponsored");

      const originalResultCount = UrlbarTestUtils.getResultCount(window);
      await selectRowByURL("https://example.com/sponsored");
      EventUtils.synthesizeKey("KEY_Delete", { shiftKey: true });
      await BrowserTestUtils.waitForCondition(
        () => originalResultCount != UrlbarTestUtils.getResultCount(window)
      );

      assertEngagementTelemetry([{ engagement_type: "dismiss" }]);
    });

    await SpecialPowers.popPrefEnv();
  }

  cleanupQuickSuggest();
});

add_task(async function engagement_type_help() {
  const cleanupQuickSuggest = await ensureQuickSuggestInit();

  for (const isBestMatchTest of [true, false]) {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.urlbar.bestMatch.enabled", isBestMatchTest]],
    });

    await doTest(async browser => {
      await openPopup("sponsored");
      await selectRowByURL("https://example.com/sponsored");
      const onTabOpened = BrowserTestUtils.waitForNewTab(gBrowser);
      if (UrlbarPrefs.get("resultMenu")) {
        UrlbarTestUtils.openResultMenuAndPressAccesskey(window, "L");
      } else {
        doClickSubButton(".urlbarView-button-help");
      }
      const tab = await onTabOpened;
      BrowserTestUtils.removeTab(tab);

      if (UrlbarPrefs.get("resultMenu")) {
        todo(
          false,
          "telemetry for the result menu to be implemented in bug 1790020"
        );
      } else {
        assertEngagementTelemetry([{ engagement_type: "help" }]);
      }
    });

    await SpecialPowers.popPrefEnv();
  }

  cleanupQuickSuggest();
});
