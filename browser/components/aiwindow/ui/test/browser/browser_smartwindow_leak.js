/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test for memory leaks from loading the smart window page.
 */
add_task(async function test_smart_window_leaks() {
  AIWindow.toggleAIWindow(window, true);
  await BrowserTestUtils.withNewTab({ url: AIWINDOW_URL, gBrowser }, () => {
    Assert.ok(true, "It's a test");
  });
  AIWindow.toggleAIWindow(window, false);
});
