/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_addressbar_shortcut_smartwindow() {
  let win = await openAIWindow();
  registerCleanupFunction(() => {
    return BrowserTestUtils.closeWindow(win);
  });

  await BrowserTestUtils.withNewTab(
    { url: "about:blank", gBrowser: win.gBrowser },
    async () => {
      win.gBrowser.selectedTab.focus();
      EventUtils.synthesizeKey("l", { accelKey: true }, win);

      // Wait for focus to be set on the URL bar
      await TestUtils.waitForCondition(
        () => win.document.activeElement === win.gURLBar.inputField,
        "Waiting for URL bar input field to be focused"
      );

      Assert.equal(
        win.document.activeElement,
        win.gURLBar.inputField,
        "URL bar should be focused after Ctrl+L in AI window on random page."
      );
    }
  );
  await BrowserTestUtils.withNewTab(
    { url: AIWINDOW_URL, gBrowser: win.gBrowser },
    async browser => {
      win.gBrowser.selectedTab.focus();
      EventUtils.synthesizeKey("l", { accelKey: true }, win);
      let smartbar = AIWindow.getSmartbarForWindow(win);
      Assert.equal(
        win.document.activeElement,
        browser,
        "Browser should be focused after Ctrl+L in AI window on AI page."
      );
      Assert.ok(
        // Note: using focusedElement rather than document.activeElement,
        // because the use of shadowroots means document.activeElement is
        // actually the <ai-window> element here.
        smartbar.inputField.shadowRoot.contains(Services.focus.focusedElement),
        "Smartbar input should be focused after Ctrl+L in AI window on AI page."
      );
    }
  );
});
