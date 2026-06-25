/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test that database connections work with enabled keystore encryption.

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
  is(
    Services.prefs.getBoolPref("security.storage.encryption.sqlite.enabled"),
    true,
    "security.storage.encryption.sqlite.enabled should be enabled"
  );

  let profileDir = Services.dirsvc.get("ProfD", Ci.nsIFile).path;
  let ksPath = profileDir + "/keystore.db";

  // Use a unique DB name per task run so test-verify iterations cannot
  // collide on stale -wal / -shm sidecars from a previous iteration.
  let dbName = `test_encryption_connect_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.sqlite`;
  let dbPath = profileDir + "/" + dbName;

  // Belt-and-braces: remove any pre-existing files for this name (and the
  // keystore so we can assert it gets re-created).
  await removeIfExists(ksPath);
  for (let suffix of ["", "-wal", "-shm", "-journal"]) {
    await removeIfExists(dbPath + suffix);
  }

  let conn = await lazy.Sqlite.openConnection({ path: dbName });

  is(conn._connectionData._open, true, "Connection should be open");

  let res = await conn.execute("SELECT 1;");
  is(res[0].getResultByIndex(0), 1, "'SELECT 1;' should return 1");

  await conn.execute("CREATE TABLE IF NOT EXISTS test (value TEXT);");
  await conn.execute("INSERT INTO test (value) VALUES ('hello');");

  await conn.close();

  is(await IOUtils.exists(ksPath), true, "keystore.db should exist");
  is(await IOUtils.exists(dbPath), true, `${dbName} should exist`);

  conn = await lazy.Sqlite.openConnection({ path: dbName });

  res = await conn.execute("SELECT value FROM test;");

  let values = res.map(row => row.getResultByName("value"));
  is(values[0], "hello", "Test `value` should be `'hello'`");

  await conn.close();
});
