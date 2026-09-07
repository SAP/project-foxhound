/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
/* global BrowserTestUtils, ok, gBrowser, add_task */

"use strict";

function assert_annotation_is_present(name, annotations) {
  ok(name in annotations, "contains the " + name + " annotation");
}

/**
 * Checks that we set the InstallTime annotation.
 */
add_task(async function test_install_time_annotation() {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
    },
    async function (browser) {
      // Crash the tab
      let annotations = await BrowserTestUtils.crashFrame(browser);

      assert_annotation_is_present("CrashEventID", annotations);
      assert_annotation_is_present("InstallTime", annotations);
    }
  );
});
