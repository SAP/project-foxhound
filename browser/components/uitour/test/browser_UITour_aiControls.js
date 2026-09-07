"use strict";

var gTestTab;
var gContentAPI;

registerCleanupFunction(function () {
  Services.prefs.clearUserPref("browser.ai.control.default");
  Services.prefs.clearUserPref("browser.ai.control.sidebarChatbot");
  Services.prefs.clearUserPref("browser.ai.control.smartWindow");
});

add_task(setup_UITourTest);

add_UITour_task(async function test_aiControls_reflects_pref_values() {
  Services.prefs.setStringPref("browser.ai.control.default", "blocked");
  Services.prefs.setStringPref(
    "browser.ai.control.sidebarChatbot",
    "available"
  );
  Services.prefs.setStringPref("browser.ai.control.smartWindow", "enabled");
  let data = await getConfigurationPromise("aiControls");
  is(data.default, "blocked", "default should reflect pref value");
  is(
    data.sidebarChatbot,
    "available",
    "sidebarChatbot should reflect pref value"
  );
  is(data.smartWindow, "enabled", "smartWindow should reflect pref value");
});
