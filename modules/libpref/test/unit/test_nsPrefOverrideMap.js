/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const BOOL_TEST_PREF = "test.nsPrefOverrideMap.bool";
const INT_TEST_PREF = "test.nsPrefOverrideMap.int";
const STRING_TEST_PREF = "test.nsPrefOverrideMap.string";

add_task(async function test_map() {
  let map = Cc["@mozilla.org/pref-override-map;1"].createInstance(
    Ci.nsIPrefOverrideMap
  );

  // Set types of prefs.  Map operations must respect them.
  Services.prefs.setBoolPref(BOOL_TEST_PREF, false);
  Services.prefs.setIntPref(INT_TEST_PREF, -1);
  Services.prefs.setStringPref(STRING_TEST_PREF, "string");

  Assert.throws(
    () => map.addEntry("not.a.real.pref", 0),
    /NS_ERROR_DOM_NOT_FOUND_ERR/
  );
  Assert.throws(
    () => map.getEntry("not.a.real.pref"),
    /NS_ERROR_DOM_NOT_FOUND_ERR/
  );

  // Entry must be added to map before getEntry
  Assert.throws(() => map.getEntry(BOOL_TEST_PREF), /NS_ERROR_ILLEGAL_VALUE/);

  // Entry value can be changed.
  map.addEntry(BOOL_TEST_PREF, false);
  Assert.equal(map.getEntry(BOOL_TEST_PREF), false);
  map.addEntry(BOOL_TEST_PREF, true);
  Assert.equal(map.getEntry(BOOL_TEST_PREF), true);

  // Cannot change pref value type
  Assert.throws(
    () => map.addEntry(BOOL_TEST_PREF, "wrong type"),
    /TypeMismatchError/
  );
  Assert.throws(
    () => map.addEntry(INT_TEST_PREF, "wrong type"),
    /TypeMismatchError/
  );
  Assert.throws(
    () => map.addEntry(STRING_TEST_PREF, true),
    /TypeMismatchError/
  );

  // null value is allowed for any type
  Assert.equal(map.getEntry(BOOL_TEST_PREF), true);
  map.addEntry(BOOL_TEST_PREF, null);
  Assert.equal(map.getEntry(BOOL_TEST_PREF), null);
  map.addEntry(INT_TEST_PREF, null);
  Assert.equal(map.getEntry(INT_TEST_PREF), null);
  map.addEntry(STRING_TEST_PREF, null);
  Assert.equal(map.getEntry(STRING_TEST_PREF), null);

  // Type must be bool, number, string or null
  Assert.throws(() => map.addEntry(BOOL_TEST_PREF, {}), /TypeMismatchError/);
  Assert.equal(map.getEntry(BOOL_TEST_PREF), null);

  // Cleanup
  Services.prefs.clearUserPref(BOOL_TEST_PREF);
  Services.prefs.clearUserPref(INT_TEST_PREF);
  Services.prefs.clearUserPref(STRING_TEST_PREF);
});
