/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

setupProfileService();

add_task(async function test_backgroundtask_locked_profile() {
  let profileService = Cc["@mozilla.org/toolkit/profile-service;1"].getService(
    Ci.nsIToolkitProfileService
  );

  let profile = profileService.createUniqueProfile(
    do_get_profile(),
    "test_locked_profile",
    "tests"
  );
  let lock = profile.lock({});

  try {
    let exitCode = await do_backgroundtask("success", {
      extraEnv: { XRE_PROFILE_PATH: lock.directory.path },
    });
    Assert.equal(1, exitCode);
  } finally {
    lock.unlock();
  }
});
