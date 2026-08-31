/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * This file tests that the guid function generates a guid of the proper length,
 * with no invalid characters.
 */

/**
 * Checks all our invariants about our guids for a given result.
 *
 * @param {string} aGuid
 *   The guid to check.
 */
function check_invariants(aGuid) {
  info("Checking guid '" + aGuid + "'");

  do_check_valid_places_guid(aGuid);
}

// Test Functions

add_task(async function test_guid_invariants() {
  const kAllowedChars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
  const kGuidLength = 12;

  let db = await PlacesUtils.promiseDBConnection();
  // Generate enough GUIDs to verify character coverage across all positions.
  let rows = await db.execute(
    `WITH RECURSIVE cnt(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM cnt WHERE x < 1000)
     SELECT GENERATE_GUID() AS guid FROM cnt`
  );
  Assert.equal(rows.length, 1000);

  let checkedChars = Array.from({ length: kGuidLength }, () => ({}));
  for (let row of rows) {
    let guid = row.getResultByName("guid");
    check_invariants(guid);
    for (let i = 0; i < guid.length; i++) {
      checkedChars[i][guid[i]] = true;
    }
  }

  // Verify all allowed characters have been seen in all positions.
  for (let i = 0; i < kGuidLength; i++) {
    for (let ch of kAllowedChars) {
      Assert.ok(checkedChars[i][ch], `Character '${ch}' seen at position ${i}`);
    }
  }
});
