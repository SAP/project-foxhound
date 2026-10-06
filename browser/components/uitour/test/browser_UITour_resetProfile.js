"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/profiles/tests/browser/head.js",
  this
);

var gTestTab;
var gContentAPI;

add_task(setup_UITourTest);

// Test that a reset profile dialog appears when "resetFirefox" event is triggered
add_UITour_task(async function test_resetFirefox() {
  let canReset = await getConfigurationPromise("canReset");
  ok(
    !canReset,
    "Shouldn't be able to reset from mochitest's temporary profile."
  );
  let dialogPromise = BrowserTestUtils.promiseAlertDialog(
    "cancel",
    "chrome://global/content/resetProfile.xhtml",
    {
      isSubDialog: true,
    }
  );

  // make reset possible.
  await initGroupDatabase();
  Assert.ok(
    SelectableProfileService.currentProfile,
    "Should have a profile now"
  );

  canReset = await getConfigurationPromise("canReset");
  ok(
    canReset,
    "Should be able to reset from mochitest's temporary profile once it's in the profile manager."
  );
  await gContentAPI.resetFirefox();
  await dialogPromise;
});
