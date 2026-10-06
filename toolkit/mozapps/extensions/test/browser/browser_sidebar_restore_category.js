/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Test that the selected category is persisted across loads of the manager

add_task(async function testCategoryRestore() {
  let win = await loadInitialView("extension");

  // Open the plugins category
  let viewLoaded = waitForViewLoad(win);
  AboutAddonsTestUtils.clickCategoryButton(win, "plugin");
  await viewLoaded;

  // Re-open the manager
  await closeView(win);
  win = await loadInitialView();

  is(
    AboutAddonsTestUtils.getSidebarSelectedCategory(win),
    "plugin",
    "Should have shown the plugins category"
  );

  // Open the extensions category
  viewLoaded = waitForViewLoad(win);
  AboutAddonsTestUtils.clickCategoryButton(win, "extension");
  await viewLoaded;

  // Re-open the manager
  await closeView(win);
  win = await loadInitialView();

  is(
    AboutAddonsTestUtils.getSidebarSelectedCategory(win),
    "extension",
    "Should have shown the extensions category"
  );

  await closeView(win);
});

add_task(async function testInvalidAddonType() {
  let win = await loadInitialView("invalid");

  is(
    AboutAddonsTestUtils.getSidebarSelectedViewId(win),
    win.gViewController.defaultViewId,
    "default view is selected"
  );
  is(
    win.gViewController.currentViewId,
    win.gViewController.defaultViewId,
    "default view is shown"
  );

  await closeView(win);
});

add_task(async function testInvalidViewId() {
  let win = await loadInitialView("addons://invalid/view");

  is(
    AboutAddonsTestUtils.getSidebarSelectedViewId(win),
    win.gViewController.defaultViewId,
    "default view is selected"
  );
  is(
    win.gViewController.currentViewId,
    win.gViewController.defaultViewId,
    "default view is shown"
  );

  await closeView(win);
});
