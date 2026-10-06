/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(function test_longPath_throwsUnrecognized() {
  // Build a path that far exceeds PATH_MAX on any platform (4096 on Linux,
  // 1024 on macOS) so that CreateUnique cannot truncate the leaf enough.
  var tempFile = Services.dirsvc.get("TmpD", Ci.nsIFile);
  var longComponent = "T".repeat(255);
  for (let i = 0; i < 20; i++) {
    tempFile.append(longComponent);
  }
  tempFile.append("test.txt");

  Assert.throws(
    () => tempFile.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0o600),
    /NS_ERROR_FILE_UNRECOGNIZED_PATH/,
    "Creating an item whose path exceeds the maximum should throw"
  );
});
