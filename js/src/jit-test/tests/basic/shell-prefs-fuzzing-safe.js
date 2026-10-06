// |jit-test| --fuzzing-safe; --setpref=tests.fuzzing-unsafe-pref; --setpref=tests.uint32-pref=8

load(libdir + "asserts.js");

// tests.fuzzing-unsafe-pref is marked |fuzzing_safe: false|. With --fuzzing-safe,
// attempts to change it are ignored (with a warning).
assertEq(getPrefValue("tests.fuzzing-unsafe-pref"), false);
setPrefValue("tests.fuzzing-unsafe-pref", true);
assertEq(getPrefValue("tests.fuzzing-unsafe-pref"), false);

// Fuzzing-safe prefs can still be changed normally.
assertEq(getPrefValue("tests.uint32-pref"), 8);
setPrefValue("tests.uint32-pref", 7);
assertEq(getPrefValue("tests.uint32-pref"), 7);
