/* Any copyright is dedicated to the Public Domain.
 *    http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Test the SearchEngine.hideOneOffButton property.
 */

"use strict";

add_setup(async function () {
  SearchTestUtils.setRemoteSettingsConfig([
    { identifier: "enterprise-a" },
    { identifier: "enterprise-b" },
  ]);

  const result = await SearchService.init();
  Assert.ok(
    Components.isSuccessCode(result),
    "Should have initialized the service"
  );

  // Disable settings-redesign to begin with.
  Services.prefs.setBoolPref("browser.settings-redesign.enabled", false);
});

add_task(async function test_hideOneOffButton() {
  let engine = SearchService.getEngineById("enterprise-b");

  Assert.ok(!engine.hideOneOffButton, "Should be false at initial creation");

  engine.hideOneOffButton = true;

  Assert.ok(
    engine.hideOneOffButton,
    "Should be set when setting it and the redesign preference is false"
  );

  Services.prefs.setBoolPref("browser.settings-redesign.enabled", true);

  Assert.ok(
    !engine.hideOneOffButton,
    "Should be false when the setting is set, but the redesign preference is true"
  );

  Services.prefs.setBoolPref("browser.settings-redesign.enabled", false);
  engine.hideOneOffButton = false;

  Assert.ok(
    !engine.hideOneOffButton,
    "Should still be false when value is reset"
  );
});
