/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Schedule reset to the initial sidebar state after the test.
SidebarTestUtils.restoreStateAtCleanup(window);

/**
 * Check that page assist sidebar renders
 */
add_task(async function test_sidebar_render() {
  await SidebarController.show("viewGenaiPageAssistSidebar");

  const { document } = SidebarController.browser.contentWindow;

  let pageAssistWrapper = document.getElementById("page-assist-wrapper");

  Assert.ok(pageAssistWrapper, "Page Assist sidebar has rendered");

  SidebarTestUtils.closePanel(window);
});
