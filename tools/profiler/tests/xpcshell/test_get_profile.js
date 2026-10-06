/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Test Services.profiler.GetProfile() and Services.profiler.getProfileData().
add_task(async () => {
  Assert.ok(!Services.profiler.IsActive());

  await Services.profiler.StartProfiler(100, 10, []);

  Assert.ok(Services.profiler.IsActive());

  await new Promise(resolve => do_timeout(100, resolve));

  // Check text profile format
  var profileStr = Services.profiler.GetProfile();
  Assert.greater(profileStr.length, 10);

  // check json profile format
  var profileObj = Services.profiler.getProfileData();
  Assert.notEqual(profileObj, null);
  Assert.notEqual(profileObj.threads, null);
  Assert.greaterOrEqual(profileObj.threads.length, 1);
  Assert.notEqual(profileObj.threads[0].samples, null);
  // NOTE: The number of samples will be empty since we
  //       don't have any labels in the xpcshell code

  await Services.profiler.StopProfiler();
  Assert.ok(!Services.profiler.IsActive());
});
