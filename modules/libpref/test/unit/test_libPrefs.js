/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// It is necessary to manually disable `xpc::IsInAutomation` since
// `resetPrefs` will flip the preference to re-enable `once`-synced
// preference change assertions, and also change the value of those
// preferences.
Services.prefs.setBoolPref(
  "security.turn_off_all_security_so_that_viruses_can_take_over_this_computer",
  false
);

const PREF_INVALID = 0;
const PREF_BOOL = 128;
const PREF_INT = 64;
const PREF_STRING = 32;

const MAX_PREF_LENGTH = 1 * 1024 * 1024;

function makeList(a) {
  var o = {};
  for (var i = 0; i < a.length; i++) {
    o[a[i]] = "";
  }
  return o;
}

add_task(async function run_test() {
  const ps = Services.prefs;

  //* *************************************************************************//
  // Nullsafety

  do_check_throws(function () {
    ps.getPrefType(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.getBoolPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.setBoolPref(null, false);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.getIntPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.setIntPref(null, 0);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.getCharPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.setCharPref(null, null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.getStringPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.setStringPref(null, null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.clearUserPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.prefHasUserValue(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.lockPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.prefIsLocked(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.unlockPref(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.deleteBranch(null);
  }, Cr.NS_ERROR_INVALID_ARG);
  do_check_throws(function () {
    ps.getChildList(null);
  }, Cr.NS_ERROR_INVALID_ARG);

  //* *************************************************************************//
  // Nonexisting user preferences

  Assert.equal(ps.prefHasUserValue("UserPref.nonexistent.hasUserValue"), false);
  ps.clearUserPref("UserPref.nonexistent.clearUserPref"); // shouldn't throw
  Assert.equal(
    ps.getPrefType("UserPref.nonexistent.getPrefType"),
    PREF_INVALID
  );
  Assert.equal(ps.root, "");

  // bool...
  do_check_throws(function () {
    ps.getBoolPref("UserPref.nonexistent.getBoolPref");
  }, Cr.NS_ERROR_UNEXPECTED);
  ps.setBoolPref("UserPref.nonexistent.setBoolPref", false);
  Assert.equal(ps.getBoolPref("UserPref.nonexistent.setBoolPref"), false);

  // int...
  do_check_throws(function () {
    ps.getIntPref("UserPref.nonexistent.getIntPref");
  }, Cr.NS_ERROR_UNEXPECTED);
  ps.setIntPref("UserPref.nonexistent.setIntPref", 5);
  Assert.equal(ps.getIntPref("UserPref.nonexistent.setIntPref"), 5);

  // char
  do_check_throws(function () {
    ps.getCharPref("UserPref.nonexistent.getCharPref");
  }, Cr.NS_ERROR_UNEXPECTED);
  ps.setCharPref("UserPref.nonexistent.setCharPref", "_test");
  Assert.equal(ps.getCharPref("UserPref.nonexistent.setCharPref"), "_test");

  //* *************************************************************************//
  // Existing user Prefs and data integrity test (round-trip match)

  ps.setBoolPref("UserPref.existing.bool", true);
  ps.setIntPref("UserPref.existing.int", 23);
  ps.setCharPref("UserPref.existing.char", "hey");

  // getPref should return the pref value
  Assert.equal(ps.getBoolPref("UserPref.existing.bool"), true);
  Assert.equal(ps.getIntPref("UserPref.existing.int"), 23);
  Assert.equal(ps.getCharPref("UserPref.existing.char"), "hey");

  // setPref should not complain and should change the value of the pref
  ps.setBoolPref("UserPref.existing.bool", false);
  Assert.equal(ps.getBoolPref("UserPref.existing.bool"), false);
  ps.setIntPref("UserPref.existing.int", 24);
  Assert.equal(ps.getIntPref("UserPref.existing.int"), 24);
  ps.setCharPref("UserPref.existing.char", "hej då!");
  Assert.equal(ps.getCharPref("UserPref.existing.char"), "hej då!");

  // prefHasUserValue should return true now
  Assert.ok(ps.prefHasUserValue("UserPref.existing.bool"));
  Assert.ok(ps.prefHasUserValue("UserPref.existing.int"));
  Assert.ok(ps.prefHasUserValue("UserPref.existing.char"));

  // clearUserPref should remove the pref
  ps.clearUserPref("UserPref.existing.bool");
  Assert.ok(!ps.prefHasUserValue("UserPref.existing.bool"));
  ps.clearUserPref("UserPref.existing.int");
  Assert.ok(!ps.prefHasUserValue("UserPref.existing.int"));
  ps.clearUserPref("UserPref.existing.char");
  Assert.ok(!ps.prefHasUserValue("UserPref.existing.char"));

  //* *************************************************************************//
  // Large value test

  let largeStr = new Array(MAX_PREF_LENGTH + 1).join("x");
  ps.setCharPref("UserPref.large.char", largeStr);
  largeStr += "x";
  do_check_throws(function () {
    ps.setCharPref("UserPref.large.char", largeStr);
  }, Cr.NS_ERROR_ILLEGAL_VALUE);

  //* *************************************************************************//
  // getPrefType test

  // bool...
  ps.setBoolPref("UserPref.getPrefType.bool", true);
  Assert.equal(ps.getPrefType("UserPref.getPrefType.bool"), PREF_BOOL);

  // int...
  ps.setIntPref("UserPref.getPrefType.int", -234);
  Assert.equal(ps.getPrefType("UserPref.getPrefType.int"), PREF_INT);

  // char...
  ps.setCharPref("UserPref.getPrefType.char", "testing1..2");
  Assert.equal(ps.getPrefType("UserPref.getPrefType.char"), PREF_STRING);

  //* *************************************************************************//
  // getBranch tests

  Assert.equal(ps.root, "");

  // bool ...
  ps.setBoolPref("UserPref.root.boolPref", true);
  let pb_1 = ps.getBranch("UserPref.root.");
  Assert.equal(pb_1.getBoolPref("boolPref"), true);
  let pb_2 = ps.getBranch("UserPref.root.boolPref");
  Assert.equal(pb_2.getBoolPref(""), true);
  pb_2.setBoolPref(".anotherPref", false);
  let pb_3 = ps.getBranch("UserPref.root.boolPre");
  Assert.equal(pb_3.getBoolPref("f.anotherPref"), false);

  // int ...
  ps.setIntPref("UserPref.root.intPref", 23);
  pb_1 = ps.getBranch("UserPref.root.");
  Assert.equal(pb_1.getIntPref("intPref"), 23);
  pb_2 = ps.getBranch("UserPref.root.intPref");
  Assert.equal(pb_2.getIntPref(""), 23);
  pb_2.setIntPref(".anotherPref", 69);
  pb_3 = ps.getBranch("UserPref.root.intPre");
  Assert.equal(pb_3.getIntPref("f.anotherPref"), 69);

  // char...
  ps.setCharPref("UserPref.root.charPref", "_char");
  pb_1 = ps.getBranch("UserPref.root.");
  Assert.equal(pb_1.getCharPref("charPref"), "_char");
  pb_2 = ps.getBranch("UserPref.root.charPref");
  Assert.equal(pb_2.getCharPref(""), "_char");
  pb_2.setCharPref(".anotherPref", "_another");
  pb_3 = ps.getBranch("UserPref.root.charPre");
  Assert.equal(pb_3.getCharPref("f.anotherPref"), "_another");

  //* *************************************************************************//
  // getChildlist tests

  // get an already set prefBranch
  let pb1 = ps.getBranch("UserPref.root.");
  let prefList = pb1.getChildList("");
  Assert.equal(prefList.length, 6);

  // check for specific prefs in the array : the order is not important
  Assert.ok("boolPref" in makeList(prefList));
  Assert.ok("intPref" in makeList(prefList));
  Assert.ok("charPref" in makeList(prefList));
  Assert.ok("boolPref.anotherPref" in makeList(prefList));
  Assert.ok("intPref.anotherPref" in makeList(prefList));
  Assert.ok("charPref.anotherPref" in makeList(prefList));

  //* *************************************************************************//
  // Default branch tests

  // bool...
  pb1 = ps.getDefaultBranch("");
  pb1.setBoolPref("DefaultPref.bool", true);
  Assert.equal(pb1.getBoolPref("DefaultPref.bool"), true);
  Assert.ok(!pb1.prefHasUserValue("DefaultPref.bool"));
  ps.setBoolPref("DefaultPref.bool", false);
  Assert.ok(pb1.prefHasUserValue("DefaultPref.bool"));
  Assert.equal(ps.getBoolPref("DefaultPref.bool"), false);

  // int...
  pb1 = ps.getDefaultBranch("");
  pb1.setIntPref("DefaultPref.int", 100);
  Assert.equal(pb1.getIntPref("DefaultPref.int"), 100);
  Assert.ok(!pb1.prefHasUserValue("DefaultPref.int"));
  ps.setIntPref("DefaultPref.int", 50);
  Assert.ok(pb1.prefHasUserValue("DefaultPref.int"));
  Assert.equal(ps.getIntPref("DefaultPref.int"), 50);

  // char...
  pb1 = ps.getDefaultBranch("");
  pb1.setCharPref("DefaultPref.char", "_default");
  Assert.equal(pb1.getCharPref("DefaultPref.char"), "_default");
  Assert.ok(!pb1.prefHasUserValue("DefaultPref.char"));
  ps.setCharPref("DefaultPref.char", "_user");
  Assert.ok(pb1.prefHasUserValue("DefaultPref.char"));
  Assert.equal(ps.getCharPref("DefaultPref.char"), "_user");

  //* *************************************************************************//
  // pref Locking/Unlocking tests

  // locking and unlocking a nonexistent pref should throw
  do_check_throws(function () {
    ps.lockPref("DefaultPref.nonexistent");
  }, Cr.NS_ERROR_ILLEGAL_VALUE);
  do_check_throws(function () {
    ps.unlockPref("DefaultPref.nonexistent");
  }, Cr.NS_ERROR_ILLEGAL_VALUE);

  // getting a locked pref branch should return the "default" value
  Assert.ok(!ps.prefIsLocked("DefaultPref.char"));
  ps.lockPref("DefaultPref.char");
  Assert.equal(ps.getCharPref("DefaultPref.char"), "_default");
  Assert.ok(ps.prefIsLocked("DefaultPref.char"));

  // getting an unlocked pref branch should return the "user" value
  ps.unlockPref("DefaultPref.char");
  Assert.equal(ps.getCharPref("DefaultPref.char"), "_user");
  Assert.ok(!ps.prefIsLocked("DefaultPref.char"));

  // setting the "default" value to a user pref branch should
  // make prefHasUserValue return false (documented behavior)
  ps.setCharPref("DefaultPref.char", "_default");
  Assert.ok(!pb1.prefHasUserValue("DefaultPref.char"));

  // unlocking and locking multiple times shouldn't throw
  ps.unlockPref("DefaultPref.char");
  ps.lockPref("DefaultPref.char");
  ps.lockPref("DefaultPref.char");

  //* *************************************************************************//
  // deleteBranch tests

  // TODO : Really, this should throw!, by documentation.
  // do_check_throws(function() {
  // ps.deleteBranch("UserPref.nonexistent.deleteBranch");}, Cr.NS_ERROR_UNEXPECTED);

  ps.deleteBranch("DefaultPref");
  let pb = ps.getBranch("DefaultPref");
  pb1 = ps.getDefaultBranch("DefaultPref");

  // getting prefs on deleted user branches should throw
  do_check_throws(function () {
    pb.getBoolPref("DefaultPref.bool");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb.getIntPref("DefaultPref.int");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb.getCharPref("DefaultPref.char");
  }, Cr.NS_ERROR_UNEXPECTED);

  // getting prefs on deleted default branches should throw
  do_check_throws(function () {
    pb1.getBoolPref("DefaultPref.bool");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb1.getIntPref("DefaultPref.int");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb1.getCharPref("DefaultPref.char");
  }, Cr.NS_ERROR_UNEXPECTED);

  //* *************************************************************************//
  // savePrefFile & readPrefFile tests

  // set some prefs
  ps.setBoolPref("ReadPref.bool", true);
  ps.setIntPref("ReadPref.int", 230);
  ps.setCharPref("ReadPref.char", "hello");

  // save those prefs in a file
  let savePrefFile = do_get_cwd();
  savePrefFile.append("data");
  savePrefFile.append("savePref.js");

  if (savePrefFile.exists()) {
    savePrefFile.remove(false);
  }
  savePrefFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o666);
  ps.savePrefFile(savePrefFile);
  ps.resetPrefs();

  // load a preexisting pref file
  let prefFile = do_get_file("data/testPref.js");
  ps.readUserPrefsFromFile(prefFile);

  // former prefs should have been replaced/lost
  do_check_throws(function () {
    pb.getBoolPref("ReadPref.bool");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb.getIntPref("ReadPref.int");
  }, Cr.NS_ERROR_UNEXPECTED);
  do_check_throws(function () {
    pb.getCharPref("ReadPref.char");
  }, Cr.NS_ERROR_UNEXPECTED);

  // loaded prefs should read ok.
  pb = ps.getBranch("testPref.");
  Assert.equal(pb.getBoolPref("bool1"), true);
  Assert.equal(pb.getBoolPref("bool2"), false);
  Assert.equal(pb.getIntPref("int1"), 23);
  Assert.equal(pb.getIntPref("int2"), -1236);
  Assert.equal(pb.getCharPref("char1"), "_testPref");
  Assert.equal(pb.getCharPref("char2"), "älskar");

  // loading our former savePrefFile should allow us to read former prefs

  // Hack alert: on Windows nsLocalFile caches the size of savePrefFile from
  // the .create() call above as 0. We call .exists() to reset the cache.
  savePrefFile.exists();

  ps.readUserPrefsFromFile(savePrefFile);
  // cleanup the file now we don't need it
  savePrefFile.remove(false);
  Assert.equal(ps.getBoolPref("ReadPref.bool"), true);
  Assert.equal(ps.getIntPref("ReadPref.int"), 230);
  Assert.equal(ps.getCharPref("ReadPref.char"), "hello");

  // ... and still be able to access "prior-to-readUserPrefs" preferences
  Assert.equal(pb.getBoolPref("bool1"), true);
  Assert.equal(pb.getBoolPref("bool2"), false);
  Assert.equal(pb.getIntPref("int1"), 23);

  //* *************************************************************************//
  // preference Observers

  class PrefObserver {
    /**
     * Creates and registers a pref observer.
     *
     * @param prefBranch The preference branch instance to observe.
     * @param expectedName The pref name we expect to receive.
     * @param expectedValue The int pref value we expect to receive.
     * @param finishedResolve A function that is called when the test is finished.
     */
    constructor(prefBranch, expectedName, expectedValue, finishedResolve) {
      this.pb = prefBranch;
      this.name = expectedName;
      this.value = expectedValue;
      this.finishedResolve = finishedResolve;
      this.resolveCalls = 0;

      prefBranch.addObserver(expectedName, this);
    }

    observe(aSubject, aTopic, aState) {
      Assert.equal(aTopic, "nsPref:changed");
      Assert.equal(aState, this.name);
      Assert.equal(this.pb.getIntPref(aState), this.value);
      pb.removeObserver(aState, this);

      // notification received, we may go on...
      this.resolveCalls++;
      this.finishedResolve();
    }
  }
  PrefObserver.QueryInterface = ChromeUtils.generateQI(["nsIObserver"]);

  let promiseResolvers = Promise.withResolvers();
  let observer = new PrefObserver(
    ps,
    "ReadPref.int",
    76,
    promiseResolvers.resolve
  );
  ps.setIntPref("ReadPref.int", 76);
  await promiseResolvers.promise;

  // removed observer should not fire
  ps.removeObserver("ReadPref.int", observer);
  ps.setIntPref("ReadPref.int", 32);

  // let's test observers once more with a non-root prefbranch
  pb = ps.getBranch("ReadPref.");
  promiseResolvers = Promise.withResolvers();
  let newObserver = new PrefObserver(pb, "int", 76, promiseResolvers.resolve);
  ps.setIntPref("ReadPref.int", 76);
  await promiseResolvers.promise;

  // Let's try that again with different pref.
  promiseResolvers = Promise.withResolvers();
  // Disabling no-unused-vars because newObserver is implicitly used
  // via promiseResolvers
  // eslint-disable-next-line no-unused-vars
  newObserver = new PrefObserver(
    pb,
    "another_int",
    76,
    promiseResolvers.resolve
  );
  ps.setIntPref("ReadPref.another_int", 76);
  await promiseResolvers.promise;

  // make sure the removed observer hasn't fired again
  Assert.equal(
    observer.resolveCalls,
    1,
    "Observer should not be called after removal"
  );
});

//* *************************************************************************//
// deleteBranch observer notification tests

/**
 * Tests that observers are notified when preferences are deleted via deleteBranch().
 */
add_task(function test_deleteBranch_observers() {
  const ps = Services.prefs;

  // Set up test preferences
  ps.setBoolPref("DeleteTest.branch1.bool", true);
  ps.setIntPref("DeleteTest.branch1.int", 42);
  ps.setCharPref("DeleteTest.branch1.char", "test");
  ps.setBoolPref("DeleteTest.branch2.bool", false);
  ps.setCharPref("DeleteTest.other", "other");

  class DeleteObserver {
    constructor() {
      this.notifications = [];
    }

    observe(aSubject, aTopic, aData) {
      Assert.equal(aTopic, "nsPref:changed");
      this.notifications.push({
        subject: aSubject,
        topic: aTopic,
        data: aData,
      });
    }
  }
  DeleteObserver.QueryInterface = ChromeUtils.generateQI(["nsIObserver"]);

  // Test 1: Observer on root branch should see all deletions
  let rootObserver = new DeleteObserver();
  ps.addObserver("DeleteTest.", rootObserver);

  // Test 2: Observer on specific branch should only see that branch's deletions
  let branchObserver = new DeleteObserver();
  let branch1 = ps.getBranch("DeleteTest.branch1.");
  branch1.addObserver("", branchObserver);

  // Test 3: Observer on specific preference should only see that preference's deletion
  let prefObserver = new DeleteObserver();
  ps.addObserver("DeleteTest.branch1.bool", prefObserver);

  // Delete the branch1 subtree
  ps.deleteBranch("DeleteTest.branch1");

  // Verify root observer received notifications for all deleted prefs in branch1
  Assert.equal(
    rootObserver.notifications.length,
    3,
    "Root observer should receive 3 notifications"
  );

  let expectedPrefs = [
    "DeleteTest.branch1.bool",
    "DeleteTest.branch1.char",
    "DeleteTest.branch1.int",
  ];
  let receivedPrefs = rootObserver.notifications.map(n => n.data).sort();
  Assert.deepEqual(
    receivedPrefs,
    expectedPrefs,
    "Root observer should receive correct pref names"
  );

  // Verify all notifications have correct topic and subject
  for (let notification of rootObserver.notifications) {
    Assert.equal(
      notification.topic,
      "nsPref:changed",
      "Topic should be nsPref:changed"
    );
    Assert.ok(
      notification.subject instanceof Ci.nsIPrefBranch,
      "Subject should be nsIPrefBranch"
    );
    Assert.ok(
      !notification.subject.root,
      "Subject root should be falsy for root observer"
    );
  }

  // Verify branch observer received notifications for branch1 prefs (without prefix)
  Assert.equal(
    branchObserver.notifications.length,
    3,
    "Branch observer should receive 3 notifications"
  );
  let expectedBranchNames = ["bool", "char", "int"];
  let receivedBranchNames = branchObserver.notifications
    .map(n => n.data)
    .sort();
  Assert.deepEqual(
    receivedBranchNames,
    expectedBranchNames,
    "Branch observer should receive pref names relative to branch root"
  );

  // Verify specific pref observer received exactly one notification
  Assert.equal(
    prefObserver.notifications.length,
    1,
    "Specific pref observer should receive 1 notification"
  );
  Assert.equal(
    prefObserver.notifications[0].data,
    "DeleteTest.branch1.bool",
    "Specific pref observer should receive correct pref name"
  );

  // Verify the preferences were actually deleted
  assertPrefNotExists(
    "DeleteTest.branch1.bool",
    "Deleted boolean pref should throw when accessed",
    "getBoolPref"
  );
  assertPrefNotExists(
    "DeleteTest.branch1.int",
    "Deleted integer pref should throw when accessed"
  );
  assertPrefNotExists(
    "DeleteTest.branch1.char",
    "Deleted char pref should throw when accessed",
    "getCharPref"
  );

  // Verify other preferences were not affected
  assertPrefExists(
    "DeleteTest.branch2.bool",
    false,
    "Unrelated preferences should not be affected",
    "getBoolPref"
  );
  assertPrefExists(
    "DeleteTest.other",
    "other",
    "Unrelated preferences should not be affected",
    "getCharPref"
  );

  // Clean up observers
  ps.removeObserver("DeleteTest.", rootObserver);
  branch1.removeObserver("", branchObserver);
  ps.removeObserver("DeleteTest.branch1.bool", prefObserver);

  // Clean up remaining test preferences
  ps.deleteBranch("DeleteTest");
});

/**
 * Tests observer notifications when deleting an empty branch.
 * This edge case ensures that no spurious notifications are sent.
 */
add_task(function test_deleteBranch_empty_branch() {
  const ps = Services.prefs;

  let observer = {
    notifications: [],
    QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
    observe(_aSubject, aTopic, aData) {
      this.notifications.push({ topic: aTopic, data: aData });
    },
  };

  ps.addObserver("EmptyBranch.", observer);

  // Delete a non-existent branch - should not generate notifications
  ps.deleteBranch("EmptyBranch");

  Assert.equal(
    observer.notifications.length,
    0,
    "Deleting empty/non-existent branch should not trigger observer notifications"
  );

  ps.removeObserver("EmptyBranch.", observer);
});

/**
 * Tests observer notifications when deleting a branch with both user and default values.
 * This ensures that both user and default preference deletions trigger notifications.
 */
add_task(function test_deleteBranch_user_and_default_values() {
  const ps = Services.prefs;

  // Set up preferences with both default and user values
  let defaultBranch = ps.getDefaultBranch("");
  defaultBranch.setBoolPref("MixedTest.pref1", false);
  defaultBranch.setIntPref("MixedTest.pref2", 10);

  // Override with user values
  ps.setBoolPref("MixedTest.pref1", true);
  ps.setIntPref("MixedTest.pref2", 20);

  // Add user-only pref
  ps.setCharPref("MixedTest.pref3", "user-only");

  let observer = {
    notifications: [],
    QueryInterface: ChromeUtils.generateQI(["nsIObserver"]),
    observe(aSubject, aTopic, aData) {
      this.notifications.push({ topic: aTopic, data: aData });
    },
  };

  ps.addObserver("MixedTest.", observer);

  // Delete the entire branch
  ps.deleteBranch("MixedTest");

  // Should receive notifications for all preferences (both user and default values get cleared)
  Assert.equal(
    observer.notifications.length,
    3,
    "Should receive notifications for all preferences with any values"
  );

  let receivedPrefs = observer.notifications.map(n => n.data).sort();
  let expectedPrefs = ["MixedTest.pref1", "MixedTest.pref2", "MixedTest.pref3"];
  Assert.deepEqual(
    receivedPrefs,
    expectedPrefs,
    "Should receive notifications for all deleted preferences"
  );

  // Verify all preferences are actually deleted
  assertPrefNotExists(
    "MixedTest.pref1",
    "Pref with default value should be completely deleted",
    "getBoolPref"
  );
  assertPrefNotExists(
    "MixedTest.pref2",
    "Pref with default value should be completely deleted"
  );
  assertPrefNotExists(
    "MixedTest.pref3",
    "User-only pref should be deleted",
    "getCharPref"
  );

  ps.removeObserver("MixedTest.", observer);
});

/**
 * Tests that weak observers are properly notified during branch deletion.
 */
add_task(function test_deleteBranch_weak_observers() {
  const ps = Services.prefs;

  // Set up test preference
  ps.setBoolPref("WeakTest.pref", true);

  let observer = {
    notifications: [],
    QueryInterface: ChromeUtils.generateQI([
      "nsIObserver",
      "nsISupportsWeakReference",
    ]),
    observe(aSubject, aTopic, aData) {
      this.notifications.push({ topic: aTopic, data: aData });
    },
  };

  // Add as weak observer
  ps.addObserver("WeakTest.", observer, true);

  // Delete the branch
  ps.deleteBranch("WeakTest");

  // Weak observer should still receive notifications
  Assert.equal(
    observer.notifications.length,
    1,
    "Weak observer should receive deletion notification"
  );
  Assert.equal(
    observer.notifications[0].data,
    "WeakTest.pref",
    "Weak observer should receive correct pref name"
  );

  ps.removeObserver("WeakTest.", observer);
});

/**
 * Helper function to assert that a preference exists with the expected value.
 *
 * @param {string} prefName - The preference name
 * @param {*} expectedValue - The expected value
 * @param {string} message - The assertion message
 * @param {Function} [getter=getIntPref] - The preference getter function (e.g., getIntPref, getBoolPref, getCharPref)
 */
function assertPrefExists(
  prefName,
  expectedValue,
  message,
  getter = "getIntPref"
) {
  Assert.equal(Services.prefs[getter](prefName), expectedValue, message);
}

/**
 * Helper function to assert that a preference does not exist.
 *
 * @param {string} prefName - The preference name
 * @param {string} message - The assertion message
 * @param {Function} [getter=getIntPref] - The preference getter function (e.g., getIntPref, getBoolPref, getCharPref)
 */
function assertPrefNotExists(prefName, message, getter = "getIntPref") {
  Assert.throws(
    () => Services.prefs[getter](prefName),
    /NS_ERROR_UNEXPECTED/,
    message
  );
}

/**
 * Tests specific edge cases for deleteBranch behavior with consecutive dots
 */
add_task(function test_deleteBranch_edge_cases() {
  const ps = Services.prefs;

  // Test case 1: deleteBranch("foo") deletes all preferences
  ps.setIntPref("EdgeTest.foo", 1);
  ps.setIntPref("EdgeTest.foo.", 2);
  ps.setIntPref("EdgeTest.foo.bar", 3);
  ps.setIntPref("EdgeTest.foo..", 4);
  ps.setIntPref("EdgeTest.foo..baz", 5);

  ps.deleteBranch("EdgeTest.foo");

  assertPrefNotExists(
    "EdgeTest.foo",
    "EdgeTest.foo should be deleted by deleteBranch('EdgeTest.foo')"
  );
  assertPrefNotExists(
    "EdgeTest.foo.",
    "EdgeTest.foo. should be deleted by deleteBranch('EdgeTest.foo')"
  );
  assertPrefNotExists(
    "EdgeTest.foo.bar",
    "EdgeTest.foo.bar should be deleted by deleteBranch('EdgeTest.foo')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..",
    "EdgeTest.foo.. should be deleted by deleteBranch('EdgeTest.foo')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..baz",
    "EdgeTest.foo..baz should be deleted by deleteBranch('EdgeTest.foo')"
  );

  // Test case 2: deleteBranch("foo.") also deletes all preferences
  ps.setIntPref("EdgeTest.foo", 1);
  ps.setIntPref("EdgeTest.foo.", 2);
  ps.setIntPref("EdgeTest.foo.bar", 3);
  ps.setIntPref("EdgeTest.foo..", 4);
  ps.setIntPref("EdgeTest.foo..baz", 5);

  ps.deleteBranch("EdgeTest.foo.");

  assertPrefNotExists(
    "EdgeTest.foo",
    "EdgeTest.foo should be deleted by deleteBranch('EdgeTest.foo.')"
  );
  assertPrefNotExists(
    "EdgeTest.foo.",
    "EdgeTest.foo. should be deleted by deleteBranch('EdgeTest.foo.')"
  );
  assertPrefNotExists(
    "EdgeTest.foo.bar",
    "EdgeTest.foo.bar should be deleted by deleteBranch('EdgeTest.foo.')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..",
    "EdgeTest.foo.. should be deleted by deleteBranch('EdgeTest.foo.')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..baz",
    "EdgeTest.foo..baz should be deleted by deleteBranch('EdgeTest.foo.')"
  );

  // Test case 3: deleteBranch("foo..") deletes only "foo.", "foo..", and "foo..baz"
  ps.setIntPref("EdgeTest.foo", 1);
  ps.setIntPref("EdgeTest.foo.", 2);
  ps.setIntPref("EdgeTest.foo.bar", 3);
  ps.setIntPref("EdgeTest.foo..", 4);
  ps.setIntPref("EdgeTest.foo..baz", 5);

  ps.deleteBranch("EdgeTest.foo..");

  assertPrefExists(
    "EdgeTest.foo",
    1,
    "EdgeTest.foo should not be deleted by deleteBranch('EdgeTest.foo..')"
  );
  assertPrefNotExists(
    "EdgeTest.foo.",
    "EdgeTest.foo. should be deleted by deleteBranch('EdgeTest.foo..')"
  );
  assertPrefExists(
    "EdgeTest.foo.bar",
    3,
    "EdgeTest.foo.bar should not be deleted by deleteBranch('EdgeTest.foo..')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..",
    "EdgeTest.foo.. should be deleted by deleteBranch('EdgeTest.foo..')"
  );
  assertPrefNotExists(
    "EdgeTest.foo..baz",
    "EdgeTest.foo..baz should be deleted by deleteBranch('EdgeTest.foo..')"
  );

  // Clean up
  ps.deleteBranch("EdgeTest");
});

/**
 * Tests the reported bug where creating a preference value, clearing it,
 * then creating it again as a different type raises an exception.
 */
add_task(function test_pref_type_change_after_clear() {
  const ps = Services.prefs;
  const prefName = "TypeChangeTest.pref";

  // Test 1: Boolean -> Integer
  ps.setBoolPref(prefName, true);
  Assert.equal(ps.getBoolPref(prefName), true);
  Assert.equal(ps.getPrefType(prefName), PREF_BOOL);

  ps.clearUserPref(prefName);
  Assert.ok(!ps.prefHasUserValue(prefName));

  // This should work without throwing an exception
  ps.setIntPref(prefName, 42);
  Assert.equal(ps.getIntPref(prefName), 42);
  Assert.equal(ps.getPrefType(prefName), PREF_INT);

  // Test 2: Integer -> String
  ps.clearUserPref(prefName);
  Assert.ok(!ps.prefHasUserValue(prefName));

  ps.setCharPref(prefName, "test_string");
  Assert.equal(ps.getCharPref(prefName), "test_string");
  Assert.equal(ps.getPrefType(prefName), PREF_STRING);

  // Test 3: String -> Boolean
  ps.clearUserPref(prefName);
  Assert.ok(!ps.prefHasUserValue(prefName));

  ps.setBoolPref(prefName, false);
  Assert.equal(ps.getBoolPref(prefName), false);
  Assert.equal(ps.getPrefType(prefName), PREF_BOOL);

  // Test 4: Test all combinations with prefBranch interface
  const pb = ps.getBranch("TypeChangeTest.");
  const branchPrefName = "branch_pref";

  // Boolean -> Integer via branch
  pb.setBoolPref(branchPrefName, true);
  Assert.equal(pb.getBoolPref(branchPrefName), true);
  Assert.equal(pb.getPrefType(branchPrefName), PREF_BOOL);

  pb.clearUserPref(branchPrefName);
  Assert.ok(!pb.prefHasUserValue(branchPrefName));

  pb.setIntPref(branchPrefName, 123);
  Assert.equal(pb.getIntPref(branchPrefName), 123);
  Assert.equal(pb.getPrefType(branchPrefName), PREF_INT);

  // Integer -> String via branch
  pb.clearUserPref(branchPrefName);
  Assert.ok(!pb.prefHasUserValue(branchPrefName));

  pb.setCharPref(branchPrefName, "branch_test");
  Assert.equal(pb.getCharPref(branchPrefName), "branch_test");
  Assert.equal(pb.getPrefType(branchPrefName), PREF_STRING);

  // String -> Boolean via branch
  pb.clearUserPref(branchPrefName);
  Assert.ok(!pb.prefHasUserValue(branchPrefName));

  pb.setBoolPref(branchPrefName, true);
  Assert.equal(pb.getBoolPref(branchPrefName), true);
  Assert.equal(pb.getPrefType(branchPrefName), PREF_BOOL);

  // Clean up
  ps.deleteBranch("TypeChangeTest");
});
