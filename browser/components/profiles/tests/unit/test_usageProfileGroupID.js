/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(lazy, {
  ClientID: "resource://gre/modules/ClientID.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
});

const DAU_GROUPID_PREF_NAME = "datareporting.dau.cachedUsageProfileGroupID";
const middleUUID = "4ff7abd7-5a64-4ef3-b88b-e5cd35b37807";
const worstUUID = "96199cc4-828d-4018-82d3-6b8101ffddce";
const bestUUID = "08f1975a-5128-4888-be29-0bab2c84cd62";

add_setup(async () => {
  startProfileService();
  const SelectableProfileService = getSelectableProfileService();
  const ProfilesDatastoreService = getProfilesDatastoreService();

  SelectableProfileService.constructor.permanentSharedPrefs.splice(
    0,
    SelectableProfileService.constructor.permanentSharedPrefs.length,
    DAU_GROUPID_PREF_NAME
  );

  lazy.ClientID.setUsageProfileGroupID(middleUUID);

  await ProfilesDatastoreService.init();
  await SelectableProfileService.init();

  await SelectableProfileService.maybeSetupDataStore();
});

add_task(async function test_groupIDConvergence() {
  const SelectableProfileService = getSelectableProfileService();
  let dbUUID = await SelectableProfileService.getDBPref(DAU_GROUPID_PREF_NAME);

  Assert.equal(
    dbUUID,
    middleUUID,
    `${DAU_GROUPID_PREF_NAME} should be ${middleUUID}`
  );
  Assert.equal(
    Services.prefs.getStringPref(DAU_GROUPID_PREF_NAME, ""),
    middleUUID,
    `${DAU_GROUPID_PREF_NAME} should be ${middleUUID}`
  );

  // Set the DAU_GROUPID_PREF_NAME to a worse value in the db and then load the
  // prefs from the db. The pref should not be updated.
  let dbChangedPromise = lazy.TestUtils.topicObserved("pds-datastore-changed");
  await SelectableProfileService.setDBPref(DAU_GROUPID_PREF_NAME, worstUUID);
  await dbChangedPromise;
  await SelectableProfileService.loadSharedPrefsFromDatabase();

  dbUUID = await SelectableProfileService.getDBPref(DAU_GROUPID_PREF_NAME);

  Assert.equal(
    dbUUID,
    worstUUID,
    `${DAU_GROUPID_PREF_NAME} should be ${worstUUID}`
  );
  Assert.equal(
    Services.prefs.getStringPref(DAU_GROUPID_PREF_NAME, ""),
    middleUUID,
    `${DAU_GROUPID_PREF_NAME} should still be ${middleUUID}`
  );

  // Now init the SelectableProfileService and confirm that we set the
  // DAU_GROUPID_PREF_NAME to our pref value in the db.
  await SelectableProfileService.uninit();
  await SelectableProfileService.init();

  dbUUID = await SelectableProfileService.getDBPref(DAU_GROUPID_PREF_NAME);

  Assert.equal(
    dbUUID,
    middleUUID,
    `${DAU_GROUPID_PREF_NAME} should now be ${middleUUID}`
  );
  Assert.equal(
    Services.prefs.getStringPref(DAU_GROUPID_PREF_NAME, ""),
    middleUUID,
    `${DAU_GROUPID_PREF_NAME} should still be ${middleUUID}`
  );

  // Set the DAU_GROUPID_PREF_NAME to a better value in the db and then load
  // the prefs from the db. The pref should be updated to the better value.
  dbChangedPromise = lazy.TestUtils.topicObserved("pds-datastore-changed");
  await SelectableProfileService.setDBPref(DAU_GROUPID_PREF_NAME, bestUUID);
  await dbChangedPromise;
  await SelectableProfileService.loadSharedPrefsFromDatabase();

  dbUUID = await SelectableProfileService.getDBPref(DAU_GROUPID_PREF_NAME);

  Assert.equal(
    dbUUID,
    bestUUID,
    `${DAU_GROUPID_PREF_NAME} should now be ${bestUUID}`
  );
  Assert.equal(
    Services.prefs.getStringPref(DAU_GROUPID_PREF_NAME, ""),
    bestUUID,
    `${DAU_GROUPID_PREF_NAME} should now be ${bestUUID}`
  );
});
