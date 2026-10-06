/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ENABLED_ON_PROFILES_PREF = "browser.backup.enabled_on.profiles";

let SelectableProfileService;
let originalCurrentProfileDescriptor;

function mockCurrentProfile(id) {
  if (!SelectableProfileService) {
    ({ SelectableProfileService } = ChromeUtils.importESModule(
      "resource:///modules/profiles/SelectableProfileService.sys.mjs"
    ));
    originalCurrentProfileDescriptor = Object.getOwnPropertyDescriptor(
      SelectableProfileService.__proto__,
      "currentProfile"
    );
  }
  Object.defineProperty(SelectableProfileService, "currentProfile", {
    get: () => ({ id }),
    configurable: true,
  });
}

function restoreCurrentProfile() {
  if (originalCurrentProfileDescriptor) {
    Object.defineProperty(
      SelectableProfileService,
      "currentProfile",
      originalCurrentProfileDescriptor
    );
  }
}

registerCleanupFunction(restoreCurrentProfile);

// Older builds stored browser.backup.enabled_on.profiles as an object rather
// than an array, which made the multi-profile banner's visible() getter throw
// and reject search initialization, breaking search.
add_task(async function test_legacy_object_format_does_not_break_search() {
  mockCurrentProfile("my-profile");

  await SpecialPowers.pushPrefEnv({
    set: [[ENABLED_ON_PROFILES_PREF, "{}"]],
  });

  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, { leaveOpen: true });

  let win = gBrowser.contentWindow;
  win.gSearchResultsPane._categoriesInitialized = null;

  let initialized = false;
  try {
    await win.gSearchResultsPane.initializeCategories();
    initialized = true;
  } catch (e) {
    ok(false, `Search initialization should not reject: ${e}`);
  }

  ok(initialized, "Search initialization resolves with a legacy-object pref");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  restoreCurrentProfile();
});
