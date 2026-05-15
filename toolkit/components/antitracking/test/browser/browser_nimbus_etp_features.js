/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

add_task(async function test_etp_features() {
  await ExperimentAPI.ready();

  info("Set the ETP category to strict");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.category", "strict"]],
  });

  // Enroll with the strict ETP features, and disable some features in the
  // enrollment.
  info("Enroll with the strict ETP features.");
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "etpStrictFeatures",
    value: {
      features:
        "-tp,-tpPrivate,cookieBehavior0,cookieBehaviorPBM0,cm,fp,stp,emailTP,emailTPPrivate,lvl2,rp,rpTop,ocsp,qps,qpsPBM,fpp,fppPrivate,-3pcd",
    },
  });

  info("Check the strict ETP related prefs are set correctly.");
  is(
    Services.prefs.getCharPref("browser.contentblocking.features.strict"),
    "-tp,-tpPrivate,cookieBehavior0,cookieBehaviorPBM0,cm,fp,stp,emailTP,emailTPPrivate,lvl2,rp,rpTop,ocsp,qps,qpsPBM,fpp,fppPrivate,-3pcd",
    "The strict ETP features should be set correctly"
  );
  is(
    Services.prefs
      .getDefaultBranch("")
      .getCharPref("browser.contentblocking.features.strict"),
    "-tp,-tpPrivate,cookieBehavior0,cookieBehaviorPBM0,cm,fp,stp,emailTP,emailTPPrivate,lvl2,rp,rpTop,ocsp,qps,qpsPBM,fpp,fppPrivate,-3pcd",
    "The strict ETP features should be set correctly to the default branch"
  );
  is(
    Services.prefs.getBoolPref("privacy.trackingprotection.enabled"),
    false,
    "The tracking protection pref has been set correctly"
  );
  is(
    Services.prefs.getBoolPref("privacy.trackingprotection.enabled"),
    false,
    "The tracking protection PBM pref has been set correctly"
  );
  is(
    Services.prefs.getBoolPref(
      "network.cookie.cookieBehavior.optInPartitioning"
    ),
    false,
    "The 3pcd pref has been set correctly"
  );
  is(
    Services.prefs.getIntPref("network.cookie.cookieBehavior"),
    Ci.nsICookieService.BEHAVIOR_ACCEPT,
    "The cookieBehavior pref has been set correctly"
  );
  is(
    Services.prefs.getIntPref("network.cookie.cookieBehavior.pbmode"),
    Ci.nsICookieService.BEHAVIOR_ACCEPT,
    "The cookieBehavior PBM pref has been set correctly"
  );

  info("Ensure we still remain in strict mode.");
  is(
    Services.prefs.getCharPref("browser.contentblocking.category"),
    "strict",
    "The ETP category should remain strict"
  );

  await doExperimentCleanup();

  // Reset the ETP category to standard.
  Services.prefs.setStringPref("browser.contentblocking.category", "standard");
});

// Test that nimbus enrollment changing strict ETP features does not reset
// user-modified allow list preferences (Bug 2022221).
add_task(async function test_etp_features_preserve_allow_list_prefs() {
  const BASELINE_PREF =
    "privacy.trackingprotection.allow_list.baseline.enabled";
  const CONVENIENCE_PREF =
    "privacy.trackingprotection.allow_list.convenience.enabled";

  await ExperimentAPI.ready();

  info("Set the ETP category to strict");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.category", "strict"]],
  });

  info("Simulate user disabling allow list baseline pref");
  Services.prefs.setBoolPref(BASELINE_PREF, false);
  Services.prefs.setBoolPref(CONVENIENCE_PREF, false);

  is(
    Services.prefs.getBoolPref(BASELINE_PREF),
    false,
    "Baseline pref should be false before enrollment"
  );
  is(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    false,
    "Convenience pref should be false before enrollment"
  );

  info("Enroll with the strict ETP features.");
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "etpStrictFeatures",
    value: {
      features:
        "-tp,-tpPrivate,cookieBehavior0,cookieBehaviorPBM0,cm,fp,stp,emailTP,emailTPPrivate,lvl2,rp,rpTop,ocsp,qps,qpsPBM,fpp,fppPrivate,-3pcd",
    },
  });

  info("Check that allow list prefs are preserved after nimbus enrollment.");
  is(
    Services.prefs.getBoolPref(BASELINE_PREF),
    false,
    "Baseline pref should remain false after nimbus enrollment"
  );
  is(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    false,
    "Convenience pref should remain false after nimbus enrollment"
  );

  info("Ensure we still remain in strict mode.");
  is(
    Services.prefs.getCharPref("browser.contentblocking.category"),
    "strict",
    "The ETP category should remain strict"
  );

  await doExperimentCleanup();

  Services.prefs.clearUserPref(BASELINE_PREF);
  Services.prefs.clearUserPref(CONVENIENCE_PREF);
  Services.prefs.setStringPref("browser.contentblocking.category", "standard");
});

// Test that nimbus enrollment changing network.lna.etp.enabled does not reset
// user-modified allow list preferences (Bug 2022221).
add_task(async function test_lna_etp_nimbus_preserves_allow_list_prefs() {
  const BASELINE_PREF =
    "privacy.trackingprotection.allow_list.baseline.enabled";
  const CONVENIENCE_PREF =
    "privacy.trackingprotection.allow_list.convenience.enabled";

  await ExperimentAPI.ready();

  info("Set the ETP category to strict");
  await SpecialPowers.pushPrefEnv({
    set: [["browser.contentblocking.category", "strict"]],
  });

  info("Simulate user disabling allow list prefs");
  Services.prefs.setBoolPref(BASELINE_PREF, false);
  Services.prefs.setBoolPref(CONVENIENCE_PREF, false);

  is(
    Services.prefs.getBoolPref(BASELINE_PREF),
    false,
    "Baseline pref should be false before LNA enrollment"
  );

  info("Enroll with the localNetworkAccess feature to enable LNA with ETP.");
  let doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
    featureId: "localNetworkAccess",
    value: {
      enableLNAWithETPStrict: true,
    },
  });

  info(
    "Check that allow list prefs are preserved after LNA nimbus enrollment."
  );
  is(
    Services.prefs.getBoolPref(BASELINE_PREF),
    false,
    "Baseline pref should remain false after LNA nimbus enrollment"
  );
  is(
    Services.prefs.getBoolPref(CONVENIENCE_PREF),
    false,
    "Convenience pref should remain false after LNA nimbus enrollment"
  );

  info("Ensure we still remain in strict mode.");
  is(
    Services.prefs.getCharPref("browser.contentblocking.category"),
    "strict",
    "The ETP category should remain strict"
  );

  await doExperimentCleanup();

  Services.prefs.clearUserPref(BASELINE_PREF);
  Services.prefs.clearUserPref(CONVENIENCE_PREF);
  Services.prefs.setStringPref("browser.contentblocking.category", "standard");
});
