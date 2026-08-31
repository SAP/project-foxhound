/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_accessibility_sidebar_hidden_when_redesign_disabled() {
    await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
    let doc = gBrowser.selectedBrowser.contentDocument;

    ok(
      !doc.getElementById("category-accessibility"),
      "Accessibility category is removed from DOM when settings redesign is disabled"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
);
