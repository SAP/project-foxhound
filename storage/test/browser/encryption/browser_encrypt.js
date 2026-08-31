/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that databases are encrypted on disk.

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});

async function removeIfExists(path) {
  if (await IOUtils.exists(path)) {
    await IOUtils.remove(path);
  }
}

add_task(async function testSecurityEnableEncryption() {
  if (
    !Services.prefs.getBoolPref(
      "security.storage.encryption.sqlite.enabled",
      false
    )
  ) {
    ok(true, "SQLite encryption disabled (landing default); skipping.");
    return;
  }

  let profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile).path;

  let dbName = `test_encryption_encrypt_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.sqlite`;
  let dbPath = PathUtils.join(profileDir, dbName);

  for (let suffix of ["", "-wal", "-shm", "-journal"]) {
    await removeIfExists(dbPath + suffix);
  }

  let conn = await lazy.Sqlite.openConnection({ path: dbName });

  is(conn._connectionData._open, true, "Connection should be open");

  let lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin a convallis nisl. Donec tincidunt sodales felis vitae tempus sed. ";

  await conn.execute("CREATE TABLE IF NOT EXISTS test (value TEXT);");
  await conn.execute("INSERT INTO test (value) VALUES ('" + lorem + "');");

  await conn.close();

  let contents = await IOUtils.read(dbPath);

  // Checking for a substring is easier than checking for a subarray.
  const decoder = new TextDecoder();
  let text = decoder.decode(contents);

  is(
    text.includes(lorem),
    false,
    "Encrypted database should not contain plain-text values"
  );
});
