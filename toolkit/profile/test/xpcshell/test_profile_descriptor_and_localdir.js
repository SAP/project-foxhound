/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
add_task(async () => {
  let svc = Cc["@mozilla.org/toolkit/profile-service;1"].getService(
    Ci.nsIToolkitProfileService
  );

  let nonRelativeRoot = gDataHome.parent.clone();
  nonRelativeRoot.append("non-relative-profile-root");
  nonRelativeRoot.createUnique(
    Ci.nsIFile.DIRECTORY_TYPE,
    FileUtils.PERMS_DIRECTORY
  );

  let isRelative = {};
  let descriptor = svc.getProfileDescriptor(nonRelativeRoot, isRelative);

  Assert.strictEqual(
    descriptor,
    nonRelativeRoot.persistentDescriptor,
    "Non-relative descriptor should be the persistent descriptor"
  );

  Assert.strictEqual(
    isRelative.value,
    false,
    "Non-relative root should report an absolute descriptor"
  );

  let localDir = svc.getLocalDirFromRootDir(nonRelativeRoot);

  Assert.strictEqual(
    localDir.path,
    nonRelativeRoot.path,
    "Non-relative local dir should match the root dir"
  );

  let relativeRoot = gDataHome.clone();
  relativeRoot.append("relative-profile-root");
  relativeRoot.createUnique(
    Ci.nsIFile.DIRECTORY_TYPE,
    FileUtils.PERMS_DIRECTORY
  );

  isRelative = {};
  descriptor = svc.getProfileDescriptor(relativeRoot, isRelative);

  let expectedDescriptor = "relative-profile-root";

  Assert.strictEqual(
    descriptor,
    expectedDescriptor,
    "Relative descriptor should be relative to gDataHome"
  );

  Assert.strictEqual(
    isRelative.value,
    true,
    "Relative root should report a relative descriptor"
  );

  localDir = svc.getLocalDirFromRootDir(relativeRoot);

  let expectedLocalDir = gDataHomeLocal.clone();
  expectedLocalDir.append("relative-profile-root");

  Assert.equal(
    localDir.path,
    expectedLocalDir.path,
    "Relative local dir should resolve under gDataHomeLocal"
  );
});
