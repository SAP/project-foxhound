/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PERMISSIONS_FILE_NAME = "permissions.sqlite";

function getPermissionsFile() {
  let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
  file.append(PERMISSIONS_FILE_NAME);
  return file;
}

function getInteractionCount(origin) {
  let db = Services.storage.openDatabase(getPermissionsFile());
  let stmt = db.createStatement(
    "SELECT COUNT(*) FROM moz_origin_interactions WHERE origin = :origin"
  );
  stmt.bindByName("origin", origin);
  stmt.executeStep();
  let count = stmt.getInt64(0);
  stmt.finalize();
  db.close();
  return count;
}

function getInteractionTime(origin) {
  let db = Services.storage.openDatabase(getPermissionsFile());
  let stmt = db.createStatement(
    "SELECT lastInteractionTime FROM moz_origin_interactions WHERE origin = :origin"
  );
  stmt.bindByName("origin", origin);
  let time = 0;
  if (stmt.executeStep()) {
    time = stmt.getInt64(0);
  }
  stmt.finalize();
  db.close();
  return time;
}

// Simulate a user interaction on the page. Synthesized mouse events have
// mReason=eSynthesized which is filtered out by EventStateManager before
// SetUserHasInteracted, so we also call userInteractionForTesting to
// ensure the interaction is recorded via the permission manager IPC path.
async function simulateUserInteraction(browser) {
  await BrowserTestUtils.synthesizeMouseAtCenter("body", {}, browser);
  await SpecialPowers.spawn(browser, [], () => {
    content.document.userInteractionForTesting();
  });
}

add_task(async function test_interaction_recorded_on_user_interaction() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.expireUnusedTypes", "desktop-notification"],
      ["permissions.expireUnused.enabled", true],
    ],
  });

  let pm = Services.perms;

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );

  pm.addFromPrincipal(
    principal,
    "desktop-notification",
    Services.perms.ALLOW_ACTION
  );

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com" },
    async function (browser) {
      await simulateUserInteraction(browser);

      await BrowserTestUtils.waitForCondition(
        () => getInteractionTime("https://example.com") > 0,
        "Waiting for interaction record to be written"
      );

      Assert.greater(
        getInteractionTime("https://example.com"),
        0,
        "lastInteractionTime should be positive"
      );

      Assert.equal(
        getInteractionCount("https://example.com"),
        1,
        "Should have exactly one interaction record"
      );
    }
  );

  pm.removeAll();
});

add_task(async function test_interaction_recorded_without_permission() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.expireUnusedTypes", "desktop-notification"],
      ["permissions.expireUnused.enabled", true],
    ],
  });

  let pm = Services.perms;
  pm.removeAll();

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.org" },
    async function (browser) {
      await simulateUserInteraction(browser);

      await BrowserTestUtils.waitForCondition(
        () => getInteractionCount("https://example.org") > 0,
        "Waiting for interaction record to be written"
      );

      is(
        getInteractionCount("https://example.org"),
        1,
        "Should have an interaction record even without expirable permission"
      );
    }
  );

  pm.removeAll();
});

add_task(async function test_interaction_updates_on_repeat_interaction() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.expireUnusedTypes", "desktop-notification"],
      ["permissions.expireUnused.enabled", true],
    ],
  });

  let pm = Services.perms;

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.net"
    );

  pm.addFromPrincipal(
    principal,
    "desktop-notification",
    Services.perms.ALLOW_ACTION
  );

  let firstInteractionTime = 0;

  // First interaction
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.net" },
    async function (browser) {
      await simulateUserInteraction(browser);

      await BrowserTestUtils.waitForCondition(
        () => getInteractionTime("https://example.net") > 0,
        "Waiting for first interaction record"
      );

      firstInteractionTime = getInteractionTime("https://example.net");
    }
  );

  Assert.greater(
    firstInteractionTime,
    0,
    "Should have recorded first interaction"
  );

  // Second interaction
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.net" },
    async function (browser) {
      await simulateUserInteraction(browser);

      await BrowserTestUtils.waitForCondition(
        () => getInteractionTime("https://example.net") >= firstInteractionTime,
        "Waiting for second interaction record"
      );

      let secondInteractionTime = getInteractionTime("https://example.net");
      Assert.greaterOrEqual(
        secondInteractionTime,
        firstInteractionTime,
        "Second interaction time should be >= first interaction time"
      );
    }
  );

  pm.removeAll();
});

// Interaction tracking always runs regardless of the expireUnused pref,
// so that data is ready when the feature is later enabled.
add_task(async function test_interaction_tracked_even_when_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.expireUnusedTypes", "desktop-notification"],
      ["permissions.expireUnused.enabled", false],
    ],
  });

  let pm = Services.perms;
  pm.removeAll();

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://www.example.com"
    );

  pm.addFromPrincipal(
    principal,
    "desktop-notification",
    Services.perms.ALLOW_ACTION
  );

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://www.example.com" },
    async function (browser) {
      await simulateUserInteraction(browser);

      await BrowserTestUtils.waitForCondition(
        () => getInteractionTime("https://www.example.com") > 0,
        "Interaction should be tracked even when feature is disabled"
      );

      Assert.greater(
        getInteractionTime("https://www.example.com"),
        0,
        "Should have an interaction record even when feature is disabled"
      );
    }
  );

  pm.removeAll();
});
