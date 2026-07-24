/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENABLED_PREF = "browser.tabs.notes.enabled";

/**
 * Wraps around the boolean tab notes pref `SpecialPowers.pushPrefEnv`
 * operations so that:
 *
 * 1. the pref value returns to its original value after the test
 * 2. the pref env stack does not grow beyond 1 item
 *
 * When the test harness calls `SpecialPowers.clearPrefEnv` to unwind a
 * larger-than-one pref env stack at the end of this test module, it spawns
 * several concurrent enable/disable operations for tab notes, which leads
 * to race conditions because the test harness doesn't know to wait for tab
 * notes' machinery to settle between pref flips. This can affect subsequent
 * tests because the tab notes machinery can turn on/off in the middle of
 * the next test module.
 *
 * This wrapper ensures that only a maximum of one enable/disable operation
 * will run when the test module is over.
 */
class PrefToggler {
  constructor() {
    /** @type {boolean} */
    this.state = Services.prefs.getBoolPref(ENABLED_PREF);
    /** @type {boolean} */
    this.initialState = this.state;
  }

  on() {
    if (this.state) {
      return Promise.resolve();
    }

    this.state = true;
    const tabNotesEnabled = TestUtils.topicObserved("TabNote:Enabled");
    if (this.initialState) {
      SpecialPowers.popPrefEnv();
    } else {
      SpecialPowers.pushPrefEnv({ set: [[ENABLED_PREF, true]] });
    }
    return tabNotesEnabled;
  }

  off() {
    if (!this.state) {
      return Promise.resolve();
    }

    this.state = false;
    const tabNotesDisabled = TestUtils.topicObserved("TabNote:Disabled");
    if (this.initialState) {
      SpecialPowers.pushPrefEnv({ set: [[ENABLED_PREF, false]] });
    } else {
      SpecialPowers.popPrefEnv();
    }
    return tabNotesDisabled;
  }
}

add_task(async function test_enable_disable() {
  const toggler = new PrefToggler();
  await toggler.on();

  info("set up a tab with a tab note");
  const tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com/");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await Promise.all([tabNoteCreated, TabNotes.set(tab, "Test note text")]);

  Assert.ok(tab.hasTabNote, "tab should indicate it has a tab note");

  info("disable tab notes and ensure the tab no longer reflects the note");
  let doesNotHaveTabNote = tabNoteIndicatorDisappears(tab);
  await Promise.all([toggler.off(), doesNotHaveTabNote]);

  Assert.ok(!tab.hasTabNote, "tab should no longer indicate it has a tab note");

  info("enable tab notes and ensure the tab once again reflects the note");
  let hasTabNote = tabNoteIndicatorAppears(tab);
  await Promise.all([toggler.on(), hasTabNote]);

  Assert.ok(tab.hasTabNote, "tab should once again indicate it has a tab note");

  BrowserTestUtils.removeTab(tab);
  await TabNotes.reset();
});
