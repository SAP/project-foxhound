/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Verifies that picking an action result records selected_result as
// `action_${actionKey}` (e.g. `action_testaction`) rather than the bare
// string `"action"`.

ChromeUtils.defineESModuleGetters(this, {
  ActionsProviderQuickActions:
    "moz-src:///browser/components/urlbar/ActionsProviderQuickActions.sys.mjs",
});

let pickCount = 0;

add_setup(async function () {
  await setup();

  ActionsProviderQuickActions.addAction("testaction", {
    commands: ["testaction"],
    label: "quickactions-downloads2",
    onPick: () => pickCount++,
  });

  // Two extra actions sharing a unique command prefix ("multi") so that
  // typing it surfaces both actions in the same global-actions row, without
  // affecting the single-action tests above that type "testaction".
  ActionsProviderQuickActions.addAction("multiaction1", {
    commands: ["multiaction1"],
    label: "quickactions-downloads2",
    onPick: () => pickCount++,
  });
  ActionsProviderQuickActions.addAction("multiaction2", {
    commands: ["multiaction2"],
    label: "quickactions-downloads2",
    onPick: () => pickCount++,
  });

  registerCleanupFunction(() => {
    ActionsProviderQuickActions.removeAction("testaction");
    ActionsProviderQuickActions.removeAction("multiaction1");
    ActionsProviderQuickActions.removeAction("multiaction2");
  });
});

async function pickActionByEnter() {
  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeKey("KEY_Tab", {}, window);
    EventUtils.synthesizeKey("KEY_Enter", {}, window);
  });
}

async function pickActionByClick() {
  const button = window.document.querySelector(
    `.urlbarView-action-btn[data-action=testaction]`
  );
  Assert.ok(button, "Action button is present");
  await UrlbarTestUtils.promisePopupClose(window, () => {
    EventUtils.synthesizeMouseAtCenter(button, {}, window);
  });
}

add_task(async function selected_result_action_via_enter() {
  await doTest(async () => {
    await openPopup("testaction");
    await BrowserTestUtils.waitForCondition(() =>
      window.document.querySelector(
        `.urlbarView-action-btn[data-action=testaction]`
      )
    );

    await pickActionByEnter();

    assertEngagementTelemetry([
      {
        selected_result: "action_testaction",
        engagement_type: "enter",
        provider: "UrlbarProviderGlobalActions",
        actions: "none,testaction",
      },
    ]);
  });
});

add_task(async function selected_result_action_via_click() {
  await doTest(async () => {
    await openPopup("testaction");
    await BrowserTestUtils.waitForCondition(() =>
      window.document.querySelector(
        `.urlbarView-action-btn[data-action=testaction]`
      )
    );

    await pickActionByClick();

    assertEngagementTelemetry([
      {
        selected_result: "action_testaction",
        engagement_type: "click",
        provider: "UrlbarProviderGlobalActions",
        actions: "none,testaction",
      },
    ]);
  });
});

// Verifies that when the global-actions row contains multiple actions,
// `selected_result` records only the picked action's key, not all of them.
add_task(async function selected_result_multi_action_via_click() {
  await doTest(async () => {
    await openPopup("multiaction");
    await BrowserTestUtils.waitForCondition(
      () =>
        window.document.querySelector(
          `.urlbarView-action-btn[data-action=multiaction1]`
        ) &&
        window.document.querySelector(
          `.urlbarView-action-btn[data-action=multiaction2]`
        )
    );

    const button = window.document.querySelector(
      `.urlbarView-action-btn[data-action=multiaction2]`
    );
    Assert.ok(button, "Second action button is present");
    await UrlbarTestUtils.promisePopupClose(window, () => {
      EventUtils.synthesizeMouseAtCenter(button, {}, window);
    });

    assertEngagementTelemetry([
      {
        selected_result: "action_multiaction2",
        engagement_type: "click",
        provider: "UrlbarProviderGlobalActions",
        actions: "none,multiaction1,multiaction2",
      },
    ]);
  });
});
