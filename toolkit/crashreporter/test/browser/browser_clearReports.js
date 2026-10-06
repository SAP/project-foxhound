/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function clickClearReports() {
  const doc = content.document;
  const reportListUnsubmitted = doc.getElementById("reportListUnsubmitted");
  const reportListSubmitted = doc.getElementById("reportListSubmitted");
  if (!reportListUnsubmitted || !reportListSubmitted) {
    Assert.ok(false, "Report list not found");
  }

  const unsubmittedStyle = doc.defaultView.getComputedStyle(
    reportListUnsubmitted
  );
  const submittedStyle = doc.defaultView.getComputedStyle(reportListSubmitted);
  Assert.notEqual(
    unsubmittedStyle.display,
    "none",
    "Unsubmitted report list is visible"
  );
  Assert.notEqual(
    submittedStyle.display,
    "none",
    "Submitted report list is visible"
  );

  const clearUnsubmittedButton = doc.getElementById("clearUnsubmittedReports");
  const clearSubmittedButton = doc.getElementById("clearSubmittedReports");
  clearUnsubmittedButton.click();
  clearSubmittedButton.click();
}

var promptShown = false;

var oldPrompt = Services.prompt;
Services.prompt = {
  confirm() {
    promptShown = true;
    return true;
  },
};

registerCleanupFunction(function () {
  Services.prompt = oldPrompt;
});

add_task(async function test() {
  let appD = make_fake_appdir();
  let crD = appD.clone();
  crD.append("Crash Reports");

  // Add crashes to submitted dir
  let submitdir = crD.clone();
  submitdir.append("submitted");

  let file1 = submitdir.clone();
  file1.append("bp-nontxt");
  file1.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o666);
  let file2 = submitdir.clone();
  file2.append("nonbp-file.txt");
  file2.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o666);
  add_fake_crashes(crD, 5);

  // Add crashes to pending dir
  let pendingdir = crD.clone();
  pendingdir.append("pending");

  let crashes = add_fake_crashes(crD, 2);
  addPendingCrashreport(crD, crashes[0].date);
  addPendingCrashreport(crD, crashes[1].date);

  registerCleanupFunction(function () {
    cleanup_fake_appdir();
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:crashes" },
    async function (browser) {
      let dirs = [submitdir, pendingdir, crD];
      let existing = [file1.path, file2.path, submitdir.path, pendingdir.path];

      SpecialPowers.spawn(browser, [], clickClearReports);
      await BrowserTestUtils.waitForCondition(
        () =>
          content.document
            .getElementById("reportListUnsubmitted")
            .classList.contains("hidden") &&
          content.document
            .getElementById("reportListSubmitted")
            .classList.contains("hidden")
      );

      for (let dir of dirs) {
        let entries = dir.directoryEntries;
        while (entries.hasMoreElements()) {
          let file = entries.nextFile;
          let index = existing.indexOf(file.path);
          isnot(index, -1, file.leafName + " exists");

          if (index != -1) {
            existing.splice(index, 1);
          }
        }
      }

      is(existing.length, 0, "All the files that should still exist exist");
      ok(promptShown, "Prompt shown");
    }
  );
});
