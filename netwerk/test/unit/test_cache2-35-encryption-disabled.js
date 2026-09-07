"use strict";

// Control for test_cache2-35: with encryption disabled (the default), the same
// entry IS stored as plaintext on disk. This both confirms the default-off
// behavior and proves the on-disk marker scan can actually detect plaintext, so
// the "marker absent" assertion in the encrypted test is meaningful.

const MARKER = "C2PLAINTEXTCONTROLMARKER";
const META = "meta-" + MARKER;
const DATA = "data-" + MARKER + "-padding-so-it-spans-some-bytes-0123456789";

function run_test() {
  // Leave browser.cache.disk.encryption.enabled at its default (false).
  do_get_profile();

  asyncOpenCacheEntry(
    "http://plaintext/",
    "disk",
    Ci.nsICacheStorage.OPEN_TRUNCATE,
    null,
    new OpenCallback(NEW | WAITFORWRITE, META, DATA, function () {
      Services.cache2
        .QueryInterface(Ci.nsICacheTesting)
        .flush(makeFlushObserver(afterFlush));
    })
  );

  do_test_pending();
}

function afterFlush() {
  Assert.ok(
    cacheDirContainsMarker(MARKER),
    "unencrypted cache is expected to contain the marker on disk"
  );
  finish_cache2_test();
}

function makeFlushObserver(callback) {
  return {
    observe() {
      executeSoon(callback);
    },
  };
}

function cacheDirContainsMarker(marker) {
  let dir = getDiskCacheDirectory();
  if (!dir.exists()) {
    return false;
  }
  return dirContainsMarker(dir, marker);
}

function dirContainsMarker(dir, marker) {
  let entries = dir.directoryEntries;
  while (entries.hasMoreElements()) {
    let file = entries.nextFile;
    if (file.isDirectory()) {
      if (dirContainsMarker(file, marker)) {
        return true;
      }
    } else if (fileContains(file, marker)) {
      return true;
    }
  }
  return false;
}

function fileContains(file, marker) {
  let fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(
    Ci.nsIFileInputStream
  );
  fstream.init(file, -1, 0, 0);
  let bstream = Cc["@mozilla.org/binaryinputstream;1"].createInstance(
    Ci.nsIBinaryInputStream
  );
  bstream.setInputStream(fstream);
  let available = bstream.available();
  let bytes = available ? bstream.readBytes(available) : "";
  bstream.close();
  return bytes.includes(marker);
}
