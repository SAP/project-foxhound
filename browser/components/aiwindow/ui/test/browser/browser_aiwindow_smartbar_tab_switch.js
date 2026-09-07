/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Regression test for the AI Window smartbar's TAB_SWITCH chiclet.
 *
 * The smartbar lives in the AI Window's content document, so UrlbarView's
 * `this.window` resolves to a content view with no `gBrowser`. Typing a query
 * that matches an open tab must still render the switch-to-tab chiclet, which
 * means UrlbarView has to read `gBrowser` off the chrome window via
 * `this.input.window`.
 */

"use strict";

add_task(async function test_smartbar_renders_switch_tab_chiclet() {
  const win = await openAIWindow();
  const chatBrowser = win.gBrowser.selectedBrowser;

  const url = "https://example.com/";
  const openedTab = BrowserTestUtils.addTab(win.gBrowser, url);
  await BrowserTestUtils.browserLoaded(openedTab.linkedBrowser, false, url);

  await promiseSmartbarSuggestionsOpen(chatBrowser, () =>
    typeInSmartbar(chatBrowser, "example.com")
  );

  await SpecialPowers.spawn(chatBrowser, [], async () => {
    const aiWindowElement = content.document.querySelector("ai-window");
    const smartbar = aiWindowElement.shadowRoot.querySelector(
      "#ai-window-smartbar"
    );

    const switchTabRow = await ContentTaskUtils.waitForCondition(
      () => smartbar.querySelector('.urlbarView-row[type="switchtab"]'),
      "Wait for switch-tab row to render"
    );

    const actionNode = switchTabRow.querySelector(".urlbarView-action");
    Assert.equal(
      actionNode?.dataset.l10nId,
      "urlbar-result-action-switch-tab",
      "Switch-tab action chiclet renders with the correct l10n label"
    );
  });

  BrowserTestUtils.removeTab(openedTab);
  await BrowserTestUtils.closeWindow(win);
});
