"use strict";

// Verifies that with disk cache encryption enabled, an entry's metadata and
// data do not appear in plaintext on disk, yet read back correctly through the
// cache API (round-trip).

const MARKER = "C2ENCRYPTIONPLAINTEXTMARKER";
const META = "meta-" + MARKER;
const DATA = "data-" + MARKER + "-padding-so-it-spans-some-bytes-0123456789";

function run_test() {
  // browser.cache.disk.encryption.enabled is set to true via the xpcshell
  // manifest so it is in effect before the profile-do-change that loads the
  // encryption key (a runtime setBoolPref here would be too late).
  do_get_profile();

  asyncOpenCacheEntry(
    "http://encrypted/",
    "disk",
    Ci.nsICacheStorage.OPEN_TRUNCATE,
    null,
    new OpenCallback(NEW | WAITFORWRITE, META, DATA, function () {
      // Force pending metadata and data to disk before inspecting the files.
      Services.cache2
        .QueryInterface(Ci.nsICacheTesting)
        .flush(makeFlushObserver(afterFlush));
    })
  );

  do_test_pending();
}

function afterFlush() {
  Assert.ok(
    !cacheDirContainsMarker(MARKER),
    "encrypted cache must not contain the plaintext marker on disk"
  );

  // Reading back through the API must restore the plaintext metadata and data.
  // OpenCallback asserts the metadata element and data match what was written.
  asyncOpenCacheEntry(
    "http://encrypted/",
    "disk",
    Ci.nsICacheStorage.OPEN_NORMALLY,
    null,
    new OpenCallback(NORMAL, META, DATA, function () {
      finish_cache2_test();
    })
  );
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
