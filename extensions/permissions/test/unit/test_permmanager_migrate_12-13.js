/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

var PERMISSIONS_FILE_NAME = "permissions.sqlite";

function getPermissionsFile(profile) {
  let file = profile.clone();
  file.append(PERMISSIONS_FILE_NAME);
  return file;
}

add_task(async function test() {
  Services.prefs.setCharPref("permissions.manager.defaultsUrl", "");
  let profile = do_get_profile();

  // We need to execute a pm method to be sure that the DB is fully
  // initialized.
  var pm = Services.perms;
  Assert.equal(pm.all.length, 0, "No permissions");

  let db = Services.storage.openDatabase(getPermissionsFile(profile));
  db.schemaVersion = 12;

  let stmtInsert = db.createStatement(
    "INSERT INTO moz_perms (" +
      "id, origin, type, permission, expireType, expireTime, modificationTime" +
      ") VALUES (" +
      ":id, :origin, :type, :permission, :expireType, :expireTime, :modificationTime" +
      ")"
  );

  let id = 0;

  function insertOrigin(
    origin,
    type,
    permission,
    expireType,
    expireTime,
    modificationTime
  ) {
    let thisId = id++;

    stmtInsert.bindByName("id", thisId);
    stmtInsert.bindByName("origin", origin);
    stmtInsert.bindByName("type", type);
    stmtInsert.bindByName("permission", permission);
    stmtInsert.bindByName("expireType", expireType);
    stmtInsert.bindByName("expireTime", expireTime);
    stmtInsert.bindByName("modificationTime", modificationTime);

    try {
      stmtInsert.execute();
    } finally {
      stmtInsert.reset();
    }

    return {
      id: thisId,
      origin,
      type,
      permission,
      expireType,
      expireTime,
      modificationTime,
    };
  }

  let { ALLOW_ACTION: ALLOW, DENY_ACTION: DENY, EXPIRE_NEVER } = Services.perms;
  let modTime = Date.now();

  // Insert permissions with some duplicate origins to test DISTINCT seeding.
  insertOrigin("https://foo.com", "geo", ALLOW, EXPIRE_NEVER, 0, modTime);
  insertOrigin("https://foo.com", "camera", ALLOW, EXPIRE_NEVER, 0, modTime);
  insertOrigin("https://bar.com", "geo", DENY, EXPIRE_NEVER, 0, modTime);
  insertOrigin(
    "https://baz.com",
    "microphone",
    ALLOW,
    EXPIRE_NEVER,
    0,
    modTime
  );

  stmtInsert.finalize();
  db.close();
  db = null;

  let expected = [
    ["https://foo.com", "geo", ALLOW, EXPIRE_NEVER, 0, modTime],
    ["https://foo.com", "camera", ALLOW, EXPIRE_NEVER, 0, modTime],
    ["https://bar.com", "geo", DENY, EXPIRE_NEVER, 0, modTime],
    ["https://baz.com", "microphone", ALLOW, EXPIRE_NEVER, 0, modTime],
  ];

  let found = expected.map(() => 0);

  // Allow a small tolerance for clock skew between JS Date.now() and C++
  // PR_Now() on Windows, where timer resolution can differ.
  let timeBeforeMigration = Date.now() - 1000;

  // This will force the permission-manager to reload the data.
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");

  // Verify permissions are unchanged after migration.
  for (let permission of Services.perms.all) {
    let isExpected = false;

    expected.forEach((it, i) => {
      if (
        permission.principal.origin == it[0] &&
        permission.type == it[1] &&
        permission.capability == it[2] &&
        permission.expireType == it[3] &&
        permission.expireTime == it[4]
      ) {
        isExpected = true;
        found[i]++;
      }
    });

    Assert.ok(
      isExpected,
      "Permission " +
        (isExpected ? "should" : "shouldn't") +
        " be in permission database: " +
        permission.principal.origin +
        ", " +
        permission.type +
        ", " +
        permission.capability +
        ", " +
        permission.expireType +
        ", " +
        permission.expireTime
    );
  }

  found.forEach((count, i) => {
    Assert.equal(
      count,
      1,
      "Expected count = 1, got count = " +
        count +
        " for permission " +
        expected[i]
    );
  });

  // Verify the migration created moz_origin_interactions and seeded it.
  {
    db = Services.storage.openDatabase(getPermissionsFile(profile));
    Assert.ok(db.tableExists("moz_perms"));
    Assert.ok(
      db.tableExists("moz_origin_interactions"),
      "moz_origin_interactions table should exist after migration"
    );

    Assert.equal(
      db.schemaVersion,
      13,
      "Schema version should be 13 after migration"
    );

    // There are 3 distinct origins, so 3 interaction records should be seeded.
    let countStmt = db.createStatement(
      "SELECT count(*) FROM moz_origin_interactions"
    );
    try {
      countStmt.executeStep();
      Assert.equal(
        countStmt.getInt64(0),
        3,
        "Should have one interaction record per distinct origin"
      );
    } finally {
      countStmt.finalize();
    }

    // Verify each distinct origin has a seeded interaction time.
    let selectStmt = db.createStatement(
      "SELECT origin, lastInteractionTime FROM moz_origin_interactions " +
        "ORDER BY origin"
    );
    let seededOrigins = [];
    try {
      let hasResult;
      while (
        (hasResult = selectStmt.executeStep()) !== undefined &&
        hasResult
      ) {
        let origin = selectStmt.getUTF8String(0);
        let interactionTime = selectStmt.getInt64(1);
        seededOrigins.push(origin);

        Assert.greaterOrEqual(
          interactionTime,
          timeBeforeMigration,
          `Interaction time for ${origin} should be >= time before migration`
        );
      }
    } finally {
      selectStmt.finalize();
    }

    Assert.deepEqual(
      seededOrigins.sort(),
      ["https://bar.com", "https://baz.com", "https://foo.com"],
      "All distinct origins should have interaction records"
    );

    db.close();
  }
});
