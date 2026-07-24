"use strict";

const HAS_USER_INTERACTED_WITH_ETP_PREF =
  "privacy.trackingprotection.allow_list.hasUserInteractedWithETPSettings";
const CONTENT_BLOCKING_CATEGORY_PREF = "browser.contentblocking.category";
const BASELINE_ALLOW_LIST_PREF =
  "privacy.trackingprotection.allow_list.baseline.enabled";
const CONVENIENCE_ALLOW_LIST_PREF =
  "privacy.trackingprotection.allow_list.convenience.enabled";
const FEATURE_TRACKING_NAME = "tracking-annotation-test";
const FEATURE_TRACKING_PREF_NAME = "urlclassifier.tracking-annotation-test";

let exceptionListService = Cc[
  "@mozilla.org/url-classifier/exception-list-service;1"
].getService(Ci.nsIUrlClassifierExceptionListService);

// Wait for the exception list service to be ready and resolve the promise when it is.
function waitForServiceReady() {
  return new Promise(resolve => {
    let observer = {
      onExceptionListUpdate: () => {
        exceptionListService.unregisterExceptionListObserver(
          FEATURE_TRACKING_NAME,
          observer
        );
        resolve();
      },
    };
    exceptionListService.registerAndRunExceptionListObserver(
      FEATURE_TRACKING_NAME,
      FEATURE_TRACKING_PREF_NAME,
      observer
    );
  });
}

// Preferences which on change will update the pref for HAS_USER_INTERACTED_WITH_ETP_PREF
// This dictionary also contains the possible values for each preference
async function cleanup() {
  Services.prefs.clearUserPref(HAS_USER_INTERACTED_WITH_ETP_PREF);
  Services.prefs.clearUserPref(BASELINE_ALLOW_LIST_PREF);
  Services.prefs.clearUserPref(CONVENIENCE_ALLOW_LIST_PREF);
  Services.prefs.clearUserPref(CONTENT_BLOCKING_CATEGORY_PREF);
  exceptionListService.clear();
}

add_task(async function test_user_interaction_pref_baseline_allow_list_true() {
  // Register the pref listeners
  await waitForServiceReady();

  info(`Setting preference ${BASELINE_ALLOW_LIST_PREF} to true`);
  Services.prefs.setBoolPref(BASELINE_ALLOW_LIST_PREF, true);
  Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

  info(`Setting preference ${BASELINE_ALLOW_LIST_PREF} to false`);
  Services.prefs.setBoolPref(BASELINE_ALLOW_LIST_PREF, false);

  info(
    "Check user interaction pref is true after modifying baseline allow list pref"
  );
  ok(
    Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
    "User interaction pref should be true"
  );

  await cleanup();
});

add_task(async function test_user_interaction_pref_baseline_allow_list_false() {
  await waitForServiceReady();

  info(`Setting preference ${BASELINE_ALLOW_LIST_PREF} to true`);
  Services.prefs.setBoolPref(BASELINE_ALLOW_LIST_PREF, true);
  Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

  info(`Setting preference ${BASELINE_ALLOW_LIST_PREF} to false`);
  Services.prefs.setBoolPref(BASELINE_ALLOW_LIST_PREF, false);

  info(
    "Check user interaction pref is true after modifying baseline allow list pref"
  );
  ok(
    Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
    "User interaction pref should be true"
  );

  await cleanup();
});

add_task(
  async function test_user_interaction_pref_convenience_allow_list_true() {
    await waitForServiceReady();

    info(`Setting preference ${CONVENIENCE_ALLOW_LIST_PREF} to true`);
    Services.prefs.setBoolPref(BASELINE_ALLOW_LIST_PREF, true);
    Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

    info(`Setting preference ${CONVENIENCE_ALLOW_LIST_PREF} to false`);
    Services.prefs.setBoolPref(CONVENIENCE_ALLOW_LIST_PREF, false);

    info(
      "Check user interaction pref is true after modifying convenience allow list pref"
    );
    ok(
      Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
      "User interaction pref should be true"
    );

    await cleanup();
  }
);

add_task(
  async function test_user_interaction_pref_convenience_allow_list_false() {
    await waitForServiceReady();

    info(`Setting preference ${CONVENIENCE_ALLOW_LIST_PREF} to true`);
    Services.prefs.setBoolPref(CONVENIENCE_ALLOW_LIST_PREF, true);
    Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

    info(`Setting preference ${CONVENIENCE_ALLOW_LIST_PREF} to false`);
    Services.prefs.setBoolPref(CONVENIENCE_ALLOW_LIST_PREF, false);

    info(
      "Check user interaction pref is true after modifying convenience allow list pref"
    );
    ok(
      Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
      "User interaction pref should be true"
    );

    await cleanup();
  }
);

add_task(
  async function test_user_interaction_pref_content_blocking_category_standard() {
    await waitForServiceReady();

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to strict`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "strict");
    Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to standard`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "standard");

    info(
      "Check user interaction pref is true after modifying content blocking category pref"
    );
    ok(
      Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
      "User interaction pref should be true"
    );

    await cleanup();
  }
);

add_task(
  async function test_user_interaction_pref_content_blocking_category_strict() {
    await waitForServiceReady();

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to standard`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "standard");
    Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to strict`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "strict");

    info(
      "Check user interaction pref is true after modifying content blocking category pref"
    );
    ok(
      Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
      "User interaction pref should be true"
    );

    await cleanup();
  }
);

add_task(
  async function test_user_interaction_pref_content_blocking_category_custom() {
    await waitForServiceReady();

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to standard`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "standard");
    Services.prefs.setBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false);

    info(`Setting preference ${CONTENT_BLOCKING_CATEGORY_PREF} to custom`);
    Services.prefs.setStringPref(CONTENT_BLOCKING_CATEGORY_PREF, "custom");

    info(
      "Check user interaction pref is true after modifying content blocking category pref"
    );
    ok(
      Services.prefs.getBoolPref(HAS_USER_INTERACTED_WITH_ETP_PREF, false),
      "User interaction pref should be true"
    );

    await cleanup();
  }
);
