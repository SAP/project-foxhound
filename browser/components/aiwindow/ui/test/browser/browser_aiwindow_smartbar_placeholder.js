/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the smartbar placeholder hints animation.
 */

"use strict";

/**
 * Asserts whether the smartbar placeholder should animate.
 *
 * @param {MozBrowser} browser
 * @param {boolean} shouldAnimatePlaceholder
 */
async function assertSmartbarHasPlaceholderAnimation(
  browser,
  shouldAnimatePlaceholder
) {
  await SpecialPowers.spawn(
    browser,
    [shouldAnimatePlaceholder],
    async shouldAnimate => {
      const smartbarEditor = ContentTaskUtils.querySelectorDeep(
        content.document,
        "#ai-window-smartbar moz-multiline-editor"
      );
      Assert.equal(
        smartbarEditor.hasAttribute("show-placeholder-animation"),
        shouldAnimate,
        `Smartbar placeholder should ${shouldAnimate ? "" : "not"} animate`
      );
    }
  );
}

add_task(async function test_smartbar_placeholder_animates_in_fullpage_mode() {
  const win = await openAIWindow();
  await assertSmartbarHasPlaceholderAnimation(
    win.gBrowser.selectedBrowser,
    true
  );
  await BrowserTestUtils.closeWindow(win);
});

add_task(
  async function test_smartbar_placeholder_does_not_animate_in_sidebar_mode() {
    const { win, sidebarBrowser } = await openAIWindowWithSidebar();
    await assertSmartbarHasPlaceholderAnimation(sidebarBrowser, false);
    await BrowserTestUtils.closeWindow(win);
  }
);

add_task(
  async function test_smartbar_placeholder_does_not_animate_navigate_from_fullpage_to_sidebar_mode() {
    const win = await openAIWindow();
    await assertSmartbarHasPlaceholderAnimation(
      win.gBrowser.selectedBrowser,
      true
    );

    const { sidebarBrowser } = await openAIWindowSidebar(win);
    await assertSmartbarHasPlaceholderAnimation(sidebarBrowser, false);
    await BrowserTestUtils.closeWindow(win);
  }
);
