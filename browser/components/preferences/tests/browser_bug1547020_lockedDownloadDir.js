/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function () {
  Services.prefs.lockPref("browser.download.useDownloadDir");

  await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
  let doc = gBrowser.selectedBrowser.contentDocument;

  var chooseFolder = doc.getElementById("chooseFolder");
  is(
    chooseFolder.disabled,
    false,
    "Choose download folder element should not be disabled."
  );

  gBrowser.removeCurrentTab();

  Services.prefs.unlockPref("browser.download.useDownloadDir");
});
