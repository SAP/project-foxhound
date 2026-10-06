/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PREF = "dom.webserial.enabled";

add_task(async function test_no_policies() {
  await setupPolicyEngineWithJson({
    policies: {},
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.INACTIVE,
    "Engine is not active"
  );
  checkUnlockedPref(PREF, true);
});

add_task(async function test_import_enterprise_roots_only() {
  await setupPolicyEngineWithJson({
    policies: {
      Certificates: {
        ImportEnterpriseRoots: true,
      },
    },
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.INACTIVE,
    "Engine is not active for ImportEnterpriseRoots-only"
  );
  checkUnlockedPref(PREF, true);
});

add_task(async function test_serial_guard_allow_alone() {
  await setupPolicyEngineWithJson({
    policies: {
      DefaultSerialGuardSetting: 3,
    },
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Engine is active"
  );
  checkUnlockedPref(PREF, true);
});

add_task(async function test_serial_guard_allow_user_can_disable() {
  await setupPolicyEngineWithJson({
    policies: {
      DefaultSerialGuardSetting: 3,
    },
  });

  checkUnlockedPref(PREF, true);

  // The pref is unlocked, so a user can still disable WebSerial via
  // about:config (modeled here as setting the user-branch pref).
  Services.prefs.setBoolPref(PREF, false);
  checkUserPref(PREF, false);

  Services.prefs.clearUserPref(PREF);
});

add_task(async function test_serial_guard_allow_with_other_policy() {
  await setupPolicyEngineWithJson({
    policies: {
      DefaultSerialGuardSetting: 3,
      BlockAboutConfig: true,
    },
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Engine is active"
  );
  checkUnlockedPref(PREF, true);
});

add_task(async function test_unrelated_policy_disables_webserial() {
  await setupPolicyEngineWithJson({
    policies: {
      BlockAboutConfig: true,
    },
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Engine is active"
  );
  checkUnlockedPref(PREF, false);
});

add_task(async function test_serial_guard_block() {
  await setupPolicyEngineWithJson({
    policies: {
      DefaultSerialGuardSetting: 2,
    },
  });

  equal(
    Services.policies.status,
    Ci.nsIEnterprisePolicies.ACTIVE,
    "Engine is active"
  );
  checkLockedPref(PREF, false);
});
