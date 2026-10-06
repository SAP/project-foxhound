// Test checks SIGBUS handling on Linux. The test cannot be used to check page
// error exception on Windows because the file cannot be truncated while it's
// being used by zipreader.
add_task(async function test_truncate() {
  var file = do_get_file("data/test_bug333423.zip");
  var tmpFile = do_get_tempdir();

  file.copyTo(tmpFile, "bug1550815.zip");
  tmpFile.append("bug1550815.zip");

  var zipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader
  );
  zipReader.open(tmpFile);

  // Truncate the file
  var ostream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(
    Ci.nsIFileOutputStream
  );
  ostream.init(tmpFile, -1, -1, 0);
  ostream.close();

  try {
    zipReader.test("modules/libjar/test/Makefile.in");
    Assert.ok(false, "Should not reach here.");
  } catch (e) {
    Assert.equal(e.result, Cr.NS_ERROR_FILE_NOT_FOUND);
  }

  zipReader.close();
  tmpFile.remove(false);
});

const INNER_FILENAME = "inner.txt";
const INNER_ZIP_NAME = "inner.zip";
function createNestedJar() {
  const OUTER_ZIP_NAME = "outer.zip";
  var tmpDir = do_get_tempdir();
  const DATA = "INNER ZIP TEST DATA";
  const time = 1199145600000;

  var innerZipFile = tmpDir.clone();
  innerZipFile.append(INNER_ZIP_NAME);
  if (innerZipFile.exists()) {
    innerZipFile.remove(false);
  }

  var zipW = Cc["@mozilla.org/zipwriter;1"].createInstance(Ci.nsIZipWriter);
  zipW.open(innerZipFile, 0x04 | 0x08 | 0x20);
  var stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(
    Ci.nsIStringInputStream
  );
  stream.setByteStringData(DATA);
  zipW.addEntryStream(
    INNER_FILENAME,
    time * 1000,
    Ci.nsIZipWriter.COMPRESSION_NONE,
    stream,
    false
  );
  zipW.close();

  var outerZipFile = tmpDir.clone();
  outerZipFile.append(OUTER_ZIP_NAME);
  if (outerZipFile.exists()) {
    outerZipFile.remove(false);
  }

  zipW.open(outerZipFile, 0x04 | 0x08 | 0x20);
  zipW.addEntryFile(
    INNER_ZIP_NAME,
    Ci.nsIZipWriter.COMPRESSION_NONE,
    innerZipFile,
    false
  );
  zipW.close();
  innerZipFile.remove(false);
  return outerZipFile;
}

add_task(async function test_inner() {
  let outerZipFile = createNestedJar();

  var outerZipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader
  );
  outerZipReader.open(outerZipFile);

  var innerZipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader
  );
  innerZipReader.openInner(outerZipReader, INNER_ZIP_NAME);

  var ostream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(
    Ci.nsIFileOutputStream
  );
  ostream.init(outerZipFile, -1, -1, 0);
  ostream.close();

  try {
    innerZipReader.test(INNER_FILENAME);
    Assert.ok(false, "Should not reach here.");
  } catch (e) {
    Assert.equal(e.result, Cr.NS_ERROR_FILE_NOT_FOUND);
  }

  innerZipReader.close();
  outerZipReader.close();
  outerZipFile.remove(false);
});

// This test checks that closing the outer zip file doesn't unmap the memory.
// The inner zip reader should keep a ref to the zipHandle
add_task(async function test_close_outer() {
  let outerZipFile = createNestedJar();

  var outerZipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader
  );
  outerZipReader.open(outerZipFile);

  var innerZipReader = Cc["@mozilla.org/libjar/zip-reader;1"].createInstance(
    Ci.nsIZipReader
  );
  innerZipReader.openInner(outerZipReader, INNER_ZIP_NAME);

  outerZipReader.close();
  try {
    innerZipReader.test(INNER_FILENAME);
    // Assert.ok(false, "Should not reach here.");
  } catch (e) {
    Assert.equal(e.result, Cr.NS_ERROR_FILE_NOT_FOUND);
  }

  innerZipReader.close();
  outerZipFile.remove(false);
});
