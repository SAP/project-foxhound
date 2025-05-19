/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/* eslint-disable mozilla/no-arbitrary-setTimeout */

"use strict";

async function setupForms(numUsernameOnly, numBasic) {
  const TEST_HOSTNAME = "https://example.com";
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_HOSTNAME + DIRECTORY_PATH + "empty.html"
  );

  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [
      {
        numUsernameOnly,
        numBasic,
      },
    ],
    async function (data) {
      // type: 1: basic, 2:usernameOnly, 3:other
      function addForm(type) {
        const form = content.document.createElement("form");
        content.document.body.appendChild(form);

        const user = content.document.createElement("input");
        if (type === 3) {
          user.type = "url";
        } else {
          user.type = "text";
          user.autocomplete = "username";
        }
        form.appendChild(user);

        if (type === 1) {
          const password = content.document.createElement("input");
          password.type = "password";
          form.appendChild(password);
        }
      }
      for (let i = 0; i < data.numBasic; i++) {
        addForm(1);
      }
      for (let i = 0; i < data.numUsernameOnly; i++) {
        addForm(2);
      }
      for (let i = 0; i < data.numOther; i++) {
        addForm(3);
      }
    }
  );

  return tab;
}

async function checkChildHistogram(id, index, expected) {
  let histogram;
  await TestUtils.waitForCondition(() => {
    let histograms = Services.telemetry.getSnapshotForHistograms(
      "main",
      false /* clear */
    ).content;

    histogram = histograms[id];
    return !!histogram && histogram.values[index] == expected;
  });
  Assert.equal(histogram.values[index], expected);
}

add_setup(async function () {
  SpecialPowers.pushPrefEnv({
    set: [
      ["signon.usernameOnlyForm.enabled", true],
      ["signon.usernameOnlyForm.lookupThreshold", 100], // ignore the threshold in test
    ],
  });

  // Wait 1sec to make sure all the telemetry data recorded prior to the beginning of the
  // test is cleared.
  await new Promise(res => setTimeout(res, 1000));
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
});

add_task(async function test_oneUsernameOnlyForm() {
  const numUsernameOnlyForms = 1;
  const numBasicForms = 0;

  let tab = await setupForms(numUsernameOnlyForms, numBasicForms);

  await checkChildHistogram(
    "PWMGR_IS_USERNAME_ONLY_FORM",
    1,
    numUsernameOnlyForms
  );

  BrowserTestUtils.removeTab(tab);
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
});

add_task(async function test_multipleUsernameOnlyForms() {
  const numUsernameOnlyForms = 3;
  const numBasicForms = 2;

  let tab = await setupForms(numUsernameOnlyForms, numBasicForms);

  await checkChildHistogram(
    "PWMGR_IS_USERNAME_ONLY_FORM",
    1,
    numUsernameOnlyForms
  );

  BrowserTestUtils.removeTab(tab);
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
});

add_task(async function test_multipleDocument() {
  // The first document
  let numUsernameOnlyForms1 = 2;
  let numBasicForms1 = 2;

  let tab1 = await setupForms(numUsernameOnlyForms1, numBasicForms1);

  await checkChildHistogram(
    "PWMGR_IS_USERNAME_ONLY_FORM",
    1,
    numUsernameOnlyForms1
  );

  // The second document
  let numUsernameOnlyForms2 = 15;
  let numBasicForms2 = 3;

  let tab2 = await setupForms(numUsernameOnlyForms2, numBasicForms2);

  await checkChildHistogram(
    "PWMGR_IS_USERNAME_ONLY_FORM",
    1,
    numUsernameOnlyForms1 + numUsernameOnlyForms2
  );

  // the result is stacked, so the new document add a counter to all
  // buckets under "numUsernameOnlyForms2 + numBasicForms2"

  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
});

add_task(async function test_tooManyUsernameOnlyForms() {
  const numUsernameOnlyForms = 25;
  const numBasicForms = 2;

  let tab = await setupForms(numUsernameOnlyForms, numBasicForms);

  await checkChildHistogram(
    "PWMGR_IS_USERNAME_ONLY_FORM",
    1,
    numUsernameOnlyForms
  );

  BrowserTestUtils.removeTab(tab);
  Services.telemetry.getSnapshotForHistograms("main", true /* clear */);
});
