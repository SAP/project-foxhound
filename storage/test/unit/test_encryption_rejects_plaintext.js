/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Bug 1996558: verifies the SQLite at-rest encryption "fail-closed" contract.
// When encryption is enabled, an in-profile database that is NOT encrypted
// (e.g. a plaintext database carried in from a non-encrypting build) must be
// refused rather than silently opened as plaintext or recreated -- there is no
// plaintext->encrypted migration by design. With encryption disabled the same
// database opens normally. This is the positive counterpart to the migration
// fixture tests, which ship plaintext databases and are therefore run with
// encryption off.

const { Sqlite } = ChromeUtils.importESModule(
  "resource://gre/modules/Sqlite.sys.mjs"
);

add_task(async function test_encryption_rejects_foreign_plaintext_database() {
  let encryptionEnabled = Services.prefs.getBoolPref(
    "security.storage.encryption.sqlite.enabled",
    false
  );

  // Create and populate a plaintext database OUTSIDE the profile. Out-of-profile
  // databases are always opened as plaintext, even when encryption is enabled,
  // so this is a genuine non-encrypted database. do_get_tempdir() is distinct
  // from the profile directory.
  let plaintextPath = PathUtils.join(
    do_get_tempdir().path,
    "foreign-plaintext.sqlite"
  );
  let inProfilePath = PathUtils.join(
    PathUtils.profileDir,
    "foreign-plaintext.sqlite"
  );
  registerCleanupFunction(async () => {
    await IOUtils.remove(plaintextPath, { ignoreAbsent: true });
    await IOUtils.remove(inProfilePath, { ignoreAbsent: true });
  });
  await IOUtils.remove(plaintextPath, { ignoreAbsent: true });

  let src = await Sqlite.openConnection({ path: plaintextPath });
  await src.execute("CREATE TABLE t (x INTEGER)");
  await src.execute("INSERT INTO t (x) VALUES (1)");
  await src.close();

  // Move the plaintext database into the profile.
  Assert.ok(
    !(await IOUtils.exists(inProfilePath)),
    "The in-profile database should not exist yet"
  );
  await IOUtils.copy(plaintextPath, inProfilePath);

  if (encryptionEnabled) {
    // Fail-closed: the encrypting build must refuse the unencrypted in-profile
    // database rather than open it as plaintext or recreate it.
    await Assert.rejects(
      Sqlite.openConnection({ path: inProfilePath }),
      /NS_ERROR_FAILURE/,
      "An encrypting build refuses a plaintext in-profile database"
    );
  } else {
    // With encryption off the database opens normally as plaintext.
    let conn = await Sqlite.openConnection({ path: inProfilePath });
    let rows = await conn.execute("SELECT x FROM t");
    Assert.equal(rows.length, 1, "Plaintext database is readable when off");
    Assert.equal(rows[0].getResultByName("x"), 1, "Row value is correct");
    await conn.close();
  }
});
