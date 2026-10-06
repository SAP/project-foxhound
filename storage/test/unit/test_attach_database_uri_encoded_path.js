/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

function newProfileFile(name) {
  let file = Services.dirsvc.get("ProfD", Ci.nsIFile);
  file.append(name);
  Assert.ok(!file.exists(), `${name} should not exist before the test`);
  return file;
}

async function openConnection(path) {
  return Sqlite.openConnection({ path });
}

add_task(async function test_attach_database_uri_encoded_path() {
  if (
    !Services.prefs.getBoolPref(
      "security.storage.encryption.sqlite.enabled",
      false
    )
  ) {
    info("SQLite encryption disabled (landing default); skipping.");
    return;
  }

  let attachedFile = newProfileFile("attached target.sqlite");
  let attached = await openConnection(attachedFile.path);
  try {
    await attached.execute("CREATE TABLE payload (value TEXT)");
    await attached.execute("INSERT INTO payload VALUES ('expected')");
  } finally {
    await attached.close();
  }

  let mainFile = newProfileFile("main.sqlite");
  let conn = await openConnection(mainFile.path);
  try {
    let attachURI =
      Services.io.newFileURI(attachedFile).spec + "?cache=private";

    await conn.attachDatabase(attachURI, "attached");

    let rows = await conn.execute("SELECT value FROM attached.payload");
    Assert.equal(
      rows[0].getResultByName("value"),
      "expected",
      "ATTACH should resolve the percent-encoded URI path to the existing database"
    );
  } finally {
    await conn.close();
  }
});
