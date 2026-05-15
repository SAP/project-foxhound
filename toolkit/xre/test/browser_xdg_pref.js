// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

add_task(async function test_pref_is_true() {
  Assert.equal(true, Services.prefs.getBoolPref("widget.support-xdg-config"));
});

add_task(async function test_pref_is_locked() {
  Services.prefs.setBoolPref("widget.support-xdg-config", false);
  Assert.equal(true, Services.prefs.getBoolPref("widget.support-xdg-config"));
});
