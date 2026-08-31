"use strict";

/** @import {ExperimentManager, OptInEntry} from "../../lib/ExperimentManager.sys.mjs" */

/* import-globals-from ../../../../../toolkit/profile/test/xpcshell/head.js */
/* import-globals-from ../../../../../browser/components/profiles/tests/unit/head.js */

ChromeUtils.defineESModuleGetters(this, {
  ObjectUtils: "resource://gre/modules/ObjectUtils.sys.mjs",
  RegionTestUtils: "resource://testing-common/RegionTestUtils.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const {
  _ExperimentFeature: ExperimentFeature,
  ExperimentAPI,
  NimbusFeatures,
} = ChromeUtils.importESModule("resource://nimbus/ExperimentAPI.sys.mjs");

const { NimbusEnrollments } = ChromeUtils.importESModule(
  "resource://nimbus/lib/Enrollments.sys.mjs"
);

const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

NimbusTestUtils.init(this);

add_setup(async function () {
  do_get_profile();

  await initSelectableProfileService();

  // TODO(bug 1967779): require the ProfilesDatastoreService to be initialized
  Services.prefs.setBoolPref("nimbus.profilesdatastoreservice.enabled", true);
  Services.prefs.setBoolPref(
    "nimbus.profilesdatastoreservice.read.enabled",
    true
  );
  NimbusEnrollments._reloadPrefsForTests();

  registerCleanupFunction(() => {
    Services.prefs.setBoolPref(
      "nimbus.profilesdatastoreservice.enabled",
      false
    );
    Services.prefs.setBoolPref(
      "nimbus.profilesdatastoreservice.read.enabled",
      false
    );
    NimbusEnrollments._reloadPrefsForTests();
  });
});

/**
 * Assert the manager has no active pref observers.
 */
function assertNoObservers(manager) {
  Assert.equal(
    manager._prefs.size,
    0,
    "There should be no active pref observers"
  );
  Assert.equal(
    manager._prefsBySlug.size,
    0,
    "There should be no active pref observers"
  );
  Assert.equal(
    manager._prefFlips._registeredPrefCount,
    0,
    "There should be no prefFlips pref observers"
  );
}

/**
 * Remove all pref observers on the given ExperimentManager.
 */
function removePrefObservers(manager) {
  for (const [name, entry] of manager._prefs.entries()) {
    Services.prefs.removeObserver(name, entry.observer);
  }

  manager._prefs.clear();
  manager._prefsBySlug.clear();
}

/**
 * Wait for the RemoteSettingsExperimentLoader to finish updating enrollments.
 *
 * @returns {Promise<void>}
 */
function promiseEnrollmentsUpdated() {
  return TestUtils.topicObserved("nimbus:enrollments-updated");
}

/**
 * An ordering function for OptInEntries
 *
 * @param {OptInEntry} a The first entry to sort.
 * @param {OptInEntry} b The second entry to sort.
 *
 * @returns {number}
 */
function orderByRecipePublishedDate(a, b) {
  return (
    new Date(a.recipe.publishedDate ?? 0) -
    new Date(b.recipe.publishedDate ?? 0)
  );
}

/**
 * Assert the contents of the ExperimentManager's opt-in list, based on slugs
 * instead of entire recipe contents.
 *
 * @param {ExperimentManager} manager
 * The manager to test.
 *
 * @param {[string, string][]} optIns
 * An array containing 2-tuples of slugs and sources.
 *
 * @param {string} message
 * An option message to include in the assertion.
 */
function assertOptInSlugs(manager, optIns, message = undefined) {
  Assert.deepEqual(
    manager.optIns
      .map(entry => [entry.recipe.slug, entry.source])
      .sort((a, b) => a[0].localeCompare(b[0])),
    optIns.toSorted((a, b) => a[0].localeCompare(b[0])),
    message
  );
}
