/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const TOPIC_BROWSERGLUE_TEST = "browser-glue-test";
const TOPICDATA_BROWSERGLUE_TEST = "force-ui-migration";
const UI_VERSION = 173;

const gBrowserGlue = Cc["@mozilla.org/browser/browserglue;1"].getService(
  Ci.nsIObserver
);

function makePrincipal(origin) {
  return Services.scriptSecurityManager.createContentPrincipalFromOrigin(
    origin
  );
}

// Test that ABA permissions (same-site origin and type suffix) are removed,
// while legitimate cross-site 3rdPartyFrameStorage permissions are preserved.
add_task(async function test_removeABAPerms() {
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref("browser.migration.version");
    Services.perms.removeAll();
  });

  Services.perms.removeAll();
  Services.prefs.setIntPref("browser.migration.version", UI_VERSION);

  let pm = Services.perms;

  // ABA permission: origin site matches the type suffix site.
  // https://example.com iframe inside https://example.com top-level.
  pm.addFromPrincipal(
    makePrincipal("https://example.com"),
    "3rdPartyFrameStorage^https://example.com",
    pm.ALLOW_ACTION
  );

  // Another ABA permission for a different site.
  pm.addFromPrincipal(
    makePrincipal("https://other.com"),
    "3rdPartyFrameStorage^https://other.com",
    pm.ALLOW_ACTION
  );

  // Legitimate cross-site permission: origin site does NOT match type suffix.
  pm.addFromPrincipal(
    makePrincipal("https://example.com"),
    "3rdPartyFrameStorage^https://tracker.com",
    pm.ALLOW_ACTION
  );

  Assert.equal(
    pm.getAllWithTypePrefix("3rdPartyFrameStorage^").length,
    3,
    "Three permissions added"
  );

  gBrowserGlue.observe(
    null,
    TOPIC_BROWSERGLUE_TEST,
    TOPICDATA_BROWSERGLUE_TEST
  );

  let remaining = pm.getAllWithTypePrefix("3rdPartyFrameStorage^");
  Assert.equal(remaining.length, 1, "Only the cross-site permission remains");
  Assert.equal(
    remaining[0].type,
    "3rdPartyFrameStorage^https://tracker.com",
    "The surviving permission is the cross-site one"
  );
});
