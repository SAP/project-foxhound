"use strict";

// The WPTEvents actor is gated on extensions.wpt.enabled at startup, so a
// runtime pref flip only affects the browser.test bindings, not the actor.

add_task(async function test_runtime_pref_flip_does_not_enable_actor() {
  Assert.equal(
    Services.prefs.getBoolPref("extensions.wpt.enabled", false),
    false,
    "extensions.wpt.enabled is off by default."
  );

  Assert.equal(
    Cu.isESModuleLoaded("resource://gre/modules/ExtensionParent.sys.mjs"),
    false,
    "ExtensionParent not preloaded; actor registration check runs on import."
  );
  ChromeUtils.importESModule("resource://gre/modules/ExtensionParent.sys.mjs");

  // Runtime flip: affects bindings only, not the already-decided actor.
  Services.prefs.setBoolPref("extensions.wpt.enabled", true);

  // Negative counterpart to test_wpt_test_events.js. Keep actor name in sync.
  let page = await ExtensionTestUtils.loadContentPage("about:blank");
  Assert.throws(
    () => page.browsingContext.currentWindowGlobal.getActor("WPTEvents"),
    /No such JSWindowActor/,
    "WPTEvents actor stays unregistered after a runtime pref flip."
  );
  await page.close();

  Services.prefs.clearUserPref("extensions.wpt.enabled");
});
