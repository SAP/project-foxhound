/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */

ChromeUtils.defineESModuleGetters(this, {
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});

const selectDownloads = `
  -- Find annotation
  WITH found_annos AS (
      SELECT a.id AS anno_id, a.anno_attribute_id
      FROM moz_annos a
      JOIN moz_anno_attributes attr
        ON a.anno_attribute_id = attr.id
      WHERE attr.name IN ('downloads/destinationFileURI', 'downloads/metaData')
  )
  -- Find downloads in moz_annos
  SELECT * FROM moz_annos
  WHERE id IN (SELECT anno_id FROM found_annos);
`;

add_task(async function test_removeDownloadsMetadataFromDb() {
  Services.prefs.setStringPref("toolkit.sqlitejsm.loglevel", "Debug");
  // Confirm that test_places.sqlite has the download information.
  const testDbPath = await setupPlacesDatabase("test_places.sqlite");
  let dbConnection;
  try {
    dbConnection = await Sqlite.openConnection({
      path: testDbPath,
      readOnly: true,
    });
    let rows = await dbConnection.execute(selectDownloads, null, null);
    const expectedResultsList = [
      { id: 3, isFilename: true, filename: "20MB\(3\).zip" },
      { id: 4, isFilename: false },
      { id: 5, isFilename: true, filename: "50MB.zip" },
      { id: 6, isFilename: false },
      { id: 11, isFilename: true, filename: "5MB\(3\).zip" },
      { id: 12, isFilename: true, filename: "10MB\(2\).zip" },
      { id: 13, isFilename: false },
      { id: 14, isFilename: false },
    ];
    for (let i = 0; i < expectedResultsList.length; i++) {
      const row = rows[i];
      const expectedResults = expectedResultsList[i];
      Assert.equal(
        row.getResultByIndex(0),
        expectedResults.id,
        `id match #${i}`
      );
      if (expectedResults.isFilename) {
        Assert.ok(
          row.getResultByIndex(3).endsWith(expectedResults.filename),
          `filename match #${i}`
        );
      } else {
        Assert.equal(
          JSON.parse(row.getResultByIndex(3)).state,
          1,
          `metadata state match #${i}`
        );
      }
    }
  } finally {
    await dbConnection?.close();
  }

  // Make a copy of test_places.sqlite and remove the download entries from it.
  const testDbCopyPath = PathUtils.join(
    PathUtils.profileDir,
    "copy_test_places.sqlite"
  );
  await IOUtils.copy(testDbPath, testDbCopyPath);
  await PlacesDBUtils.removeDownloadsMetadataFromDb(testDbCopyPath);

  // Confirm that copy_test_places.sqlite does not have download information.
  try {
    dbConnection = await Sqlite.openConnection({
      path: testDbCopyPath,
      readOnly: true,
    });
    let rows = await dbConnection.execute(selectDownloads, null, null);
    Assert.equal(
      rows.length,
      0,
      "moz_annos had no downloads or download metadata"
    );
  } finally {
    await dbConnection?.close();
  }
});
