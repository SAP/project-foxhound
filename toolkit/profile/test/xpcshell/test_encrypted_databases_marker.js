/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests for nsIXULRuntime.markProfileEncryptedDatabases: appends
// EncryptedDatabases=1 under [Compatibility] in compatibility.ini,
// preserving the other keys, idempotently.

const COMPAT_LEAF = "compatibility.ini";

// Resolve the profile dir the same way the implementation does
// (NS_APP_PROFILE_DIR_STARTUP), so the test reads and writes the same
// compatibility.ini.
function getCompatIni() {
  let dir = Services.dirsvc.get("ProfDS", Ci.nsIFile);
  dir.append(COMPAT_LEAF);
  return dir;
}

function readCompatIni() {
  let f = getCompatIni();
  if (!f.exists()) {
    return null;
  }
  return Cc["@mozilla.org/xpcom/ini-parser-factory;1"]
    .getService(Ci.nsIINIParserFactory)
    .createINIParser(f);
}

async function setCompatIniContents(text) {
  let f = getCompatIni();
  await IOUtils.writeUTF8(f.path, text);
}

add_task(async function test_mark_writes_marker() {
  // Start with a realistic compatibility.ini (matching what WriteVersion
  // produces on a normal startup).
  await setCompatIniContents(
    "[Compatibility]\nLastVersion=1.0_20200101000000/20200101000000\n" +
      "LastOSABI=Darwin_aarch64-gcc3\n" +
      "LastPlatformDir=/path/to/gre\n"
  );

  Services.appinfo.markProfileEncryptedDatabases();

  let parser = readCompatIni();
  Assert.ok(parser, "compatibility.ini still exists after marking");
  Assert.equal(
    parser.getString("Compatibility", "EncryptedDatabases"),
    "1",
    "marker should be written"
  );
  // Other keys must be preserved (the marker is appended, not rewritten).
  Assert.equal(
    parser.getString("Compatibility", "LastVersion"),
    "1.0_20200101000000/20200101000000"
  );
  Assert.equal(
    parser.getString("Compatibility", "LastOSABI"),
    "Darwin_aarch64-gcc3"
  );
  Assert.equal(
    parser.getString("Compatibility", "LastPlatformDir"),
    "/path/to/gre"
  );
});

add_task(async function test_mark_is_idempotent() {
  // The previous test left the marker on disk. Mark again; the writer should
  // see the existing marker and skip, leaving the bytes unchanged.
  let f = getCompatIni();
  Assert.ok(f.exists(), "compatibility.ini should still exist");

  let before = await IOUtils.readUTF8(f.path);
  Assert.ok(
    before.includes("EncryptedDatabases=1"),
    "first-test residual should be on disk"
  );

  Services.appinfo.markProfileEncryptedDatabases();

  let after = await IOUtils.readUTF8(f.path);
  Assert.equal(
    after,
    before,
    "second mark is a no-op (marker already present)"
  );
});

add_task(async function test_mark_preserves_invalidate_caches() {
  await setCompatIniContents(
    "[Compatibility]\nLastVersion=2.0_20200101000000/20200101000000\n" +
      "LastOSABI=Darwin_aarch64-gcc3\n" +
      "LastPlatformDir=/path/to/gre\n" +
      "InvalidateCaches=1\n"
  );

  Services.appinfo.markProfileEncryptedDatabases();

  let parser = readCompatIni();
  Assert.equal(
    parser.getString("Compatibility", "EncryptedDatabases"),
    "1",
    "marker still written"
  );
  Assert.equal(
    parser.getString("Compatibility", "InvalidateCaches"),
    "1",
    "InvalidateCaches preserved"
  );
});
