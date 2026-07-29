/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function waitForDbUpdatePropagation() {
  let { promise, resolve } = Promise.withResolvers();

  Services.obs.addObserver(function observer(subject, topic) {
    if (topic == "sps-profiles-updated") {
      Services.obs.removeObserver(observer, "sps-profiles-updated");
      resolve();
    }
  }, "sps-profiles-updated");

  return promise;
}

function triggerDbUpdate() {
  let dbUpdate = waitForDbUpdatePropagation();
  Services.obs.notifyObservers(null, "pds-datastore-changed");
  return dbUpdate;
}

add_task(async function test_windowTitle() {
  // Initializing the database creates the first profile and dispatches the
  // database update notification. Wait for it to ensure it isn't accidentally
  // caught later.
  let dbUpdate = waitForDbUpdatePropagation();
  await initGroupDatabase();
  await dbUpdate;

  // The currentProfile is null, because there are 0 profiles in the db, when
  // updateTitlebar is called in the EveryWindow init function.
  // So we uninit and init again so we have a current profile when
  // updateTitlebar is called.
  await SelectableProfileService.uninit();
  await SelectableProfileService.init();

  const profileName = SelectableProfileService.currentProfile.name;

  // If there is only one profile we shouldn't add it to the title.
  Assert.ok(
    !document.title.includes(profileName),
    "The profile name is not in the window title"
  );

  dbUpdate = waitForDbUpdatePropagation();
  let newProfile = await SelectableProfileService.createNewProfile(
    false,
    null,
    "tests"
  );
  await dbUpdate;

  Assert.ok(
    document.title.includes(profileName),
    "The profile name is in the window title"
  );

  dbUpdate = waitForDbUpdatePropagation();
  await SelectableProfileService.deleteProfile(newProfile);
  await dbUpdate;

  Assert.ok(
    !document.title.includes(profileName),
    "The profile name is not in the window title"
  );

  // Simulate another instance creating a new profile
  let connection = await openDatabase();
  await connection.execute(
    "INSERT INTO Profiles (id,path,name,avatar,themeId,themeFg,themeBg) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [55, "somewhere", "new profile", "briefcase", "other", "red", "blue"]
  );
  await connection.close();

  await triggerDbUpdate();

  Assert.ok(
    document.title.includes(profileName),
    "The profile name is in the window title"
  );

  await SelectableProfileService.uninit();

  Assert.ok(
    !document.title.includes(profileName),
    "The profile name is not in the window title"
  );
});
