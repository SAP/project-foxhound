/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests whether the new and old searchbars get initialized/uninitialized
 * when enabled/disabled.
 */

add_task(async function () {
  SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", false]],
  });
  info("Opening new window (browser.search.widget.new=false).");
  let win = await BrowserTestUtils.openNewBrowserWindow();
  let newSearchbar = win.document.querySelector("#searchbar-new");
  let oldSearchbar = win.document.querySelector("#searchbar");
  Assert.ok(!newSearchbar.controller, "New searchbar wasn't initialized");
  Assert.ok(!!oldSearchbar.firstChild, "Old searchbar was initialized");

  info("Enabling new searchbar.");
  SpecialPowers.popPrefEnv();
  await TestUtils.waitForTick();
  Assert.ok(!!newSearchbar.controller, "New searchbar was initialized");
  Assert.ok(!oldSearchbar.firstChild, "Old searchbar was uninitialized");
  await BrowserTestUtils.closeWindow(win);

  info("Opening new window (browser.search.widget.new=true).");
  win = await BrowserTestUtils.openNewBrowserWindow();
  newSearchbar = win.document.querySelector("#searchbar-new");
  oldSearchbar = win.document.querySelector("#searchbar");
  Assert.ok(!!newSearchbar.controller, "New searchbar was initialized");
  Assert.ok(!oldSearchbar.firstChild, "Old searchbar wasn't initialized");

  info("Disabling new searchbar.");
  let spy = sinon.spy(newSearchbar, "_removeObservers");
  SpecialPowers.pushPrefEnv({
    set: [["browser.search.widget.new", false]],
  });
  await TestUtils.waitForTick();
  Assert.ok(spy.calledOnce, "New searchbar was uninitialized");
  Assert.ok(!!oldSearchbar.firstChild, "Old searchbar was initialized");

  sinon.restore();
  await BrowserTestUtils.closeWindow(win);
  SpecialPowers.popPrefEnv();
});
