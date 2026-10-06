/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENABLED_ON_PROFILES_PREF = "browser.backup.enabled_on.profiles";
const UPLOAD_ENABLED_PREF = "datareporting.healthreport.uploadEnabled";

let SelectableProfileService;
let originalCurrentProfileDescriptor;

function mockCurrentProfile(id) {
  if (!SelectableProfileService) {
    ({ SelectableProfileService } = ChromeUtils.importESModule(
      "resource:///modules/profiles/SelectableProfileService.sys.mjs"
    ));
    originalCurrentProfileDescriptor =
      Object.getOwnPropertyDescriptor(
        SelectableProfileService.__proto__,
        "currentProfile"
      ) ||
      Object.getOwnPropertyDescriptor(
        SelectableProfileService,
        "currentProfile"
      );
  }
  Object.defineProperty(SelectableProfileService, "currentProfile", {
    get: () => ({ id }),
    configurable: true,
  });
}

function restoreCurrentProfile() {
  if (!SelectableProfileService) {
    return;
  }
  if (originalCurrentProfileDescriptor) {
    Object.defineProperty(
      SelectableProfileService,
      "currentProfile",
      originalCurrentProfileDescriptor
    );
  } else {
    delete SelectableProfileService.currentProfile;
  }
}

registerCleanupFunction(restoreCurrentProfile);

add_task(async function test_banner_visible_when_other_profiles_have_backup() {
  if (!AppConstants.MOZ_TELEMETRY_REPORTING) {
    ok(true, "Skipping test because telemetry reporting is disabled");
    return;
  }

  mockCurrentProfile("my-profile");

  await SpecialPowers.pushPrefEnv({
    set: [
      [ENABLED_ON_PROFILES_PREF, JSON.stringify(["other"])],
      [UPLOAD_ENABLED_PREF, true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  let banner = doc.getElementById("backup-multi-profile-warning-message-bar");

  let bannerShown = BrowserTestUtils.waitForMutationCondition(
    banner,
    { attributeFilter: ["hidden"] },
    () => !banner.hidden
  );

  await SpecialPowers.pushPrefEnv({
    set: [[UPLOAD_ENABLED_PREF, false]],
  });

  await bannerShown;

  ok(
    !banner.hidden,
    "Banner should be visible when other profiles have backup and a pref changed"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
  await SpecialPowers.popPrefEnv();
  restoreCurrentProfile();
});

add_task(
  async function test_banner_hidden_when_only_current_profile_has_backup() {
    mockCurrentProfile("my-profile");

    await SpecialPowers.pushPrefEnv({
      set: [[ENABLED_ON_PROFILES_PREF, JSON.stringify(["my-profile"])]],
    });

    await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
      leaveOpen: true,
    });

    let doc = gBrowser.contentDocument;
    let banner = doc.getElementById("backup-multi-profile-warning-message-bar");

    ok(
      banner.hidden,
      "Banner should be hidden when only current profile has backup"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
    restoreCurrentProfile();
  }
);

add_task(async function test_banner_hidden_when_no_profiles_enabled() {
  mockCurrentProfile("my-profile");

  await SpecialPowers.pushPrefEnv({
    set: [[ENABLED_ON_PROFILES_PREF, "[]"]],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  let banner = doc.getElementById("backup-multi-profile-warning-message-bar");

  ok(banner.hidden, "Banner should be hidden when no profiles have backup");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
  restoreCurrentProfile();
});

add_task(async function test_banner_shows_on_data_collection_pref_change() {
  if (!AppConstants.MOZ_TELEMETRY_REPORTING) {
    ok(true, "Skipping test because telemetry reporting is disabled");
    return;
  }

  mockCurrentProfile("my-profile");

  await SpecialPowers.pushPrefEnv({
    set: [
      [ENABLED_ON_PROFILES_PREF, JSON.stringify(["my-profile", "other"])],
      [UPLOAD_ENABLED_PREF, true],
    ],
  });

  await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
    leaveOpen: true,
  });

  let doc = gBrowser.contentDocument;
  let banner = doc.getElementById("backup-multi-profile-warning-message-bar");

  ok(banner.hidden, "Banner should start hidden before any pref change");

  let bannerShown = BrowserTestUtils.waitForMutationCondition(
    banner,
    { attributeFilter: ["hidden"] },
    () => !banner.hidden
  );

  await SpecialPowers.pushPrefEnv({
    set: [[UPLOAD_ENABLED_PREF, false]],
  });

  await bannerShown;

  ok(
    !banner.hidden,
    "Banner should be visible after data collection pref change"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
  await SpecialPowers.popPrefEnv();
  restoreCurrentProfile();
});

add_task(
  async function test_banner_hides_when_pref_reverted_to_original_value() {
    if (!AppConstants.MOZ_TELEMETRY_REPORTING) {
      ok(true, "Skipping test because telemetry reporting is disabled");
      return;
    }

    mockCurrentProfile("my-profile");

    await SpecialPowers.pushPrefEnv({
      set: [
        [ENABLED_ON_PROFILES_PREF, JSON.stringify(["my-profile", "other"])],
        [UPLOAD_ENABLED_PREF, true],
      ],
    });

    await openPreferencesViaOpenPreferencesAPI("panePrivacy", {
      leaveOpen: true,
    });

    let doc = gBrowser.contentDocument;
    let banner = doc.getElementById("backup-multi-profile-warning-message-bar");

    ok(banner.hidden, "Banner should start hidden before any pref change");

    let bannerShown = BrowserTestUtils.waitForMutationCondition(
      banner,
      { attributeFilter: ["hidden"] },
      () => !banner.hidden
    );

    await SpecialPowers.pushPrefEnv({
      set: [[UPLOAD_ENABLED_PREF, false]],
    });

    await bannerShown;

    ok(!banner.hidden, "Banner should be visible after pref change");

    let bannerHidden = BrowserTestUtils.waitForMutationCondition(
      banner,
      { attributeFilter: ["hidden"] },
      () => banner.hidden
    );

    await SpecialPowers.popPrefEnv();

    await bannerHidden;

    ok(
      banner.hidden,
      "Banner should be hidden after pref is reverted to original value"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
    restoreCurrentProfile();
  }
);
