/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { SelectableProfile } = ChromeUtils.importESModule(
  "resource:///modules/profiles/SelectableProfile.sys.mjs"
);

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

// Waits for the stub to be called and then resolves with the result of the
// provided behaviour or the original method if no behaviour is provided.
function waitForCall(stub, behaviour = stub.wrappedMethod) {
  let { promise, resolve } = Promise.withResolvers();

  stub.callsFake(function (...args) {
    let result = behaviour.apply(this, args);
    resolve(result);

    return result;
  });

  return promise;
}

function rejects(promise) {
  return promise.then(
    () => Promise.reject(),
    () => Promise.resolve()
  );
}

add_task(async function test_updateDefaultProfileOnWindowSwitch() {
  await initGroupDatabase();
  let currentProfile = SelectableProfileService.currentProfile;
  let profileRootDir = await currentProfile.rootDir;

  let asyncFlushCurrentProfile = sinon.stub(
    gProfileService,
    "asyncFlushCurrentProfile"
  );
  let asyncFlush = sinon.stub(gProfileService, "asyncFlush");
  let setDefaultProfileForGroup = sinon.stub(
    SelectableProfileService,
    "setDefaultProfileForGroup"
  );

  ok(
    SelectableProfileService.currentProfile instanceof SelectableProfile,
    "The current selectable profile exists"
  );
  is(
    gProfileService.currentProfile.rootDir.path,
    profileRootDir.path,
    `The SelectableProfileService rootDir is correct`
  );

  Services.telemetry.clearEvents();
  Services.fog.testResetFOG();
  is(
    null,
    Glean.profilesDefault.updated.testGetValue(),
    "We have not recorded any Glean data yet"
  );

  let window2 = await BrowserTestUtils.openNewBrowserWindow();
  await SimpleTest.promiseFocus(window2);

  let currentWindow = window2;
  async function switchWindow() {
    let newWindow = currentWindow === window2 ? window : window2;
    await SimpleTest.promiseFocus(newWindow);
    currentWindow = newWindow;
  }

  info("Switching windows when the profile hasn't changed doesn't flush");

  let setDefaultCalled = waitForCall(setDefaultProfileForGroup);
  // Focus the original window so we get an "activate" event and consider updating the toolkitProfile rootDir
  await switchWindow();
  await setDefaultCalled;

  // Because the rootDir was unchanged we shouldn't have performed any flushing.
  Assert.equal(
    asyncFlushCurrentProfile.callCount,
    0,
    "Should not have flushed the current profile"
  );
  Assert.equal(asyncFlush.callCount, 0, "Should not have flushed");

  info(
    "Switching windows when the profile has changed flushes the current profile"
  );

  // Override
  let badRoot = uAppData.clone();
  badRoot.append("bad");
  gProfileService.currentProfile.rootDir = badRoot;

  let flushedCurrentProfile = waitForCall(asyncFlushCurrentProfile, () =>
    Promise.resolve()
  );
  await switchWindow();
  await flushedCurrentProfile;

  info(
    "Switching windows when the profile has changed and flushing the current fails does a full flush"
  );

  gProfileService.currentProfile.rootDir = badRoot;

  flushedCurrentProfile = waitForCall(asyncFlushCurrentProfile, () =>
    Promise.reject()
  );
  let flushed = waitForCall(asyncFlush, () => Promise.resolve());

  await switchWindow();

  await rejects(flushedCurrentProfile);
  await flushed;

  is(
    gProfileService.currentProfile.rootDir.path,
    profileRootDir.path,
    `The SelectableProfileService rootDir is correct`
  );

  let testEvents = Glean.profilesDefault.updated.testGetValue();
  Assert.equal(
    2,
    testEvents.length,
    "Should have recorded the default profile updated event exactly two times"
  );
  TelemetryTestUtils.assertEvents(
    [
      ["profiles", "default", "updated"],
      ["profiles", "default", "updated"],
    ],
    {
      category: "profiles",
      method: "default",
    }
  );

  await BrowserTestUtils.closeWindow(window2);
  await SelectableProfileService.uninit();
  asyncFlushCurrentProfile.restore();
  asyncFlush.restore();
});
