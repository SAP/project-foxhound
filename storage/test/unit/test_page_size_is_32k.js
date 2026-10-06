/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

// Default SQLite page size: 32 KiB normally, 8 KiB with encryption on
// (obfsvfs::kObfsPageSize).

const kEncryptionEnabled = Services.prefs.getBoolPref(
  "security.storage.encryption.sqlite.enabled",
  false
);
const kExpectedPageSize = kEncryptionEnabled ? 8192 : 32768;
const kExpectedCacheSize = -2048; // 2MiB

function check_size(db) {
  var stmt = db.createStatement("PRAGMA page_size");
  stmt.executeStep();
  Assert.equal(
    stmt.getInt32(0),
    kExpectedPageSize,
    "page_size matches expected default for encryption=" + kEncryptionEnabled
  );
  stmt.finalize();
  stmt = db.createStatement("PRAGMA cache_size");
  stmt.executeStep();
  Assert.equal(stmt.getInt32(0), kExpectedCacheSize);
  stmt.finalize();
}

function new_file(name) {
  var file = Services.dirsvc.get("ProfD", Ci.nsIFile);
  file.append(name + ".sqlite");
  Assert.ok(!file.exists());
  return file;
}

function run_test() {
  check_size(getDatabase(new_file("shared_default_pagesize")));
  check_size(
    Services.storage.openUnsharedDatabase(new_file("unshared_default_pagesize"))
  );
}
