/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

const TEST_URL =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "empty_file.html";

/*
 * Register cleanup function to reset prefs after other tasks have run.
 */

add_setup(async function () {
  // Per browser_enable_DRM_prompt.js , SpecialPowers.pushPrefEnv has
  // problems with buttons on the notification bar toggling the prefs.
  // So manually reset the prefs the UI we're testing toggles.

  // This preference is needed because tests run with
  // xpinstall.signatures.required=false to install a helper extension
  // This triggers the JSHacks exemption, which we need to disable
  // for our test to work.
  Services.prefs.setBoolPref(
    "security.parent_unrestricted_js_loads.skip_jshacks",
    true
  );
  // This preference is needed to prevent the Opt builds from crashing.
  // Currently we allow a single crash from an unexpected script load,
  // to try and understand the problem better via crash reports.
  // (It has not worked.)
  let originalCrashes = Services.prefs.getIntPref(
    "security.crash_tracking.js_load_1.maxCrashes",
    0
  );
  Services.prefs.setIntPref("security.crash_tracking.js_load_1.maxCrashes", 0);

  registerCleanupFunction(function () {
    Services.prefs.setBoolPref(
      "security.block_parent_unrestricted_js_loads.temporary",
      false
    );
    Services.prefs.setBoolPref(
      "security.allow_parent_unrestricted_js_loads",
      false
    );
    Services.prefs.setBoolPref(
      "security.parent_unrestricted_js_loads.skip_jshacks",
      false
    );
    Services.prefs.setIntPref(
      "security.crash_tracking.js_load_1.maxCrashes",
      originalCrashes
    );
  });
});

async function runWorkflow(actions_to_take, expected_results) {
  // ============================================================
  // ============================================================
  // Reset things for each invoation
  Services.obs.notifyObservers(
    null,
    "UnexpectedJavaScriptLoad-ResetNotification"
  );
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "datareporting.healthreport.uploadEnabled",
        actions_to_take.enable_telemetry,
      ],
    ],
  });

  // ============================================================
  // ============================================================
  // Set up expected results
  expected_results = expected_results || {};

  // All of these functions take an integer indicating the number of telemetry events
  // They return true if that number is expected.
  expected_results.inforBarDismissed = function (num_events) {
    return num_events == 0;
  };

  expected_results.dialogDismissed = function (num_events) {
    return num_events == 0;
  };

  expected_results.moreInfoOpened = function (num_events) {
    return num_events == 0;
  };

  if (actions_to_take.click_block === true) {
    expected_results.first_paragraph_text =
      "unexpected-script-load-detail-1-block";
    expected_results.report_checkbox_checked_by_default = true;
    expected_results.block_pref_set = true;
    expected_results.allow_pref_set = false;
    expected_results.scriptBlockedOpened = function (num_events) {
      return num_events > 0;
    };
    expected_results.scriptAllowedOpened = function (num_events) {
      return num_events == 0;
    };
    expected_results.scriptBlocked = function (num_events) {
      return num_events > 0;
    };
    expected_results.scriptAllowed = function (num_events) {
      return num_events == 0;
    };
  } else {
    expected_results.first_paragraph_text =
      "unexpected-script-load-detail-1-allow";
    expected_results.report_checkbox_checked_by_default = false;
    expected_results.block_pref_set = false;
    expected_results.allow_pref_set = true;
    expected_results.scriptBlockedOpened = function (num_events) {
      return num_events == 0;
    };
    expected_results.scriptAllowedOpened = function (num_events) {
      return num_events > 0;
    };
    expected_results.scriptBlocked = function (num_events) {
      return num_events == 0;
    };
    expected_results.scriptAllowed = function (num_events) {
      return num_events > 0;
    };
  }

  if (actions_to_take.report) {
    expected_results.should_have_report = true;
  } else {
    expected_results.should_have_report = false;
  }

  if (actions_to_take.report_email) {
    expected_results.should_have_report_email = true;
  } else {
    expected_results.should_have_report_email = false;
  }

  // ============================================================
  // ============================================================
  let window = BrowserWindowTracker.getTopWindow();
  let notificationShownPromise = BrowserTestUtils.waitForGlobalNotificationBar(
    window,
    "unexpected-script-notification"
  );

  // ============================================================
  // ============================================================
  // Main body of test - enclosed in a function so we can put it
  // first (in the file) before the telemetry assertions
  let runTest = async () => {
    // ============================================================
    // Trigger the notification
    let sandbox = Cu.Sandbox(null);
    try {
      // This will trigger the unexpected script load notification.
      // On Nightly, where we enforce the restriction, it will also
      // cause an error, necessitating the try/catch.
      Cu.evalInSandbox(
        "let x = 1",
        sandbox,
        "1.8",
        "https://example.net/script.js",
        1
      );
    } catch (e) {}

    let notification = await notificationShownPromise;

    // ============================================================
    // Verify the notification bar showed.
    ok(notification, "Notification should be visible");
    is(
      notification.getAttribute("value"),
      "unexpected-script-notification",
      "Should be showing the right notification"
    );

    // ============================================================
    // Verify the buttons are there.
    let buttons = notification.buttonContainer.querySelectorAll(
      ".notification-button"
    );
    is(buttons.length, 2, "Should have two buttons.");
    let learnMoreLinks = notification.querySelectorAll(".notification-link");
    is(learnMoreLinks.length, 1, "Should have one learn more link.");

    // ============================================================
    // Open the dialog by clicking the Block Button
    let dialogShownPromise = new Promise(resolve => {
      BrowserTestUtils.waitForEvent(
        window.document.getElementById("window-modal-dialog"),
        "dialogopen",
        false,
        () => {
          return true;
        }
      ).then(event => {
        resolve(event.originalTarget);
      });
    });

    // On the notification bar, the order of the buttons is constant: always [Allow] [Block]
    // it only changes on the dialog, but we choose buttons there based on id
    let buttonIndex = actions_to_take.click_block ? 1 : 0;
    buttons[buttonIndex].click();

    await dialogShownPromise;

    // ============================================================
    // Confirm we opened the dialog
    is(
      window?.gDialogBox?.dialog?._openedURL,
      "chrome://browser/content/security/unexpectedScriptLoad.xhtml",
      "Should have an open dialog"
    );

    // ============================================================
    // Verify the dialog says the right thing
    let firstParagraph =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "unexpected-script-load-detail-1"
      );
    isnot(firstParagraph, null, "Should have one detail paragraph.");
    is(
      firstParagraph.getAttribute("data-l10n-id"),
      expected_results.first_paragraph_text,
      "Should have the right detail text."
    );

    // ============================================================
    // Verify the telemetry message
    let telemetryMessage =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "telemetry-disabled-message"
      );
    isnot(telemetryMessage, null, "Should have one telemetry message.");
    is(
      telemetryMessage.hasAttribute("hidden"),
      !!actions_to_take.enable_telemetry,
      `Telemetry Message should ${actions_to_take.enable_telemetry ? "" : "not"} be visible`
    );

    // ============================================================
    // Verify the report checkbox is checked
    let reportCheckbox =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "reportCheckbox"
      );
    isnot(reportCheckbox, null, "Should have one report checkbox.");
    is(
      reportCheckbox.checked,
      expected_results.report_checkbox_checked_by_default &&
        actions_to_take.enable_telemetry,
      `Report checkbox should ${expected_results.report_checkbox_checked_by_default && actions_to_take.enable_telemetry ? "" : "not"} be checked by default`
    );

    // ============================================================
    // Fill in the checkboxes and email field as appropriate
    if (actions_to_take.report) {
      reportCheckbox.checked = true;
    }

    let emailCheckbox =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "emailCheckbox"
      );
    isnot(emailCheckbox, null, "Should have one email checkbox.");
    is(
      emailCheckbox.checked,
      false,
      "Email checkbox should not be checked by default"
    );

    if (actions_to_take.report_email) {
      emailCheckbox.checked = true;
      let emailField =
        window.gDialogBox.dialog._frame.contentDocument.getElementById(
          "emailInput"
        );
      isnot(emailField, null, "Should have one email field.");
      emailField.value = "test@example.com";
    }

    // ============================================================
    // Find the Buttons
    let blockButton =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "block-button"
      );
    isnot(blockButton, null, "Should have one block button.");

    let allowButton =
      window.gDialogBox.dialog._frame.contentDocument.getElementById(
        "allow-button"
      );
    isnot(allowButton, null, "Should have one allow button.");

    // ============================================================
    // Prepare to close the dialog
    let dialogClosePromise = new Promise(resolve => {
      BrowserTestUtils.waitForEvent(
        window.document.getElementById("window-modal-dialog"),
        "dialogclose",
        false,
        () => {
          return true;
        }
      ).then(event => {
        resolve(event.originalTarget);
      });
    });

    // ============================================================
    // Take an action and close the dialog
    if (actions_to_take.click_block) {
      blockButton.click();
    } else {
      allowButton.click();
    }

    await dialogClosePromise;

    // ============================================================
    // Confirm the action did the right thing
    let isBlocked = Services.prefs.getBoolPref(
      "security.block_parent_unrestricted_js_loads.temporary",
      false
    );
    is(
      isBlocked,
      expected_results.block_pref_set,
      `Should ${expected_results.block_pref_set ? "" : "not"} have set the pref`
    );

    let isAllowed = Services.prefs.getBoolPref(
      "security.allow_parent_unrestricted_js_loads",
      false
    );
    is(
      isAllowed,
      expected_results.allow_pref_set,
      `Should ${expected_results.allow_pref_set ? "" : "not"} have set the allow pref`
    );
  };

  // ============================================================
  // ============================================================
  // Now test the telemetry.
  //   (in actually this function call runs the test itself, as the above
  //    is all just a function definition, but it's awkward that the order
  //    has to be this way, so we're jumping through a hoop so you can
  //    read the file in the same order it executes in.)
  await GleanPings.unexpectedScriptLoad.testSubmission(async () => {
    isnot(
      // We always see this one
      Glean.unexpectedScriptLoad.infobarShown.testGetValue()?.length ?? 0,
      0,
      "Should have recorded an infobarShown telemetry event"
    );
    ok(
      expected_results.inforBarDismissed(
        Glean.unexpectedScriptLoad.infobarDismissed.testGetValue()?.length ?? 0
      ),
      "InfoBarDismissed telemetry event"
    );
    ok(
      expected_results.dialogDismissed(
        Glean.unexpectedScriptLoad.dialogDismissed.testGetValue()?.length ?? 0
      ),
      "DialogDismissed telemetry event"
    );
    let scriptBlockedOpenedSeen =
      Glean.unexpectedScriptLoad.scriptBlockedOpened.testGetValue()?.length ??
      0;
    ok(
      expected_results.scriptBlockedOpened(scriptBlockedOpenedSeen),
      `ScriptBlockedOpened telemetry event: saw ${scriptBlockedOpenedSeen}`
    );
    let scriptAllowedOpenedSeen =
      Glean.unexpectedScriptLoad.scriptAllowedOpened.testGetValue()?.length ??
      0;
    ok(
      expected_results.scriptAllowedOpened(scriptAllowedOpenedSeen),
      `scriptAllowedOpened telemetry event: saw ${scriptAllowedOpenedSeen}`
    );
    ok(
      expected_results.moreInfoOpened(
        Glean.unexpectedScriptLoad.moreInfoOpened.testGetValue()?.length ?? 0
      ),
      "moreInfoOpened telemetry event"
    );
    let scriptBlockedSeen =
      Glean.unexpectedScriptLoad.scriptBlocked.testGetValue()?.length ?? 0;
    ok(
      expected_results.scriptBlocked(scriptBlockedSeen),
      `scriptBlocked telemetry event: saw ${scriptBlockedSeen}`
    );
    let scriptAllowedSeen =
      Glean.unexpectedScriptLoad.scriptAllowed.testGetValue()?.length ?? 0;
    ok(
      expected_results.scriptAllowed(scriptAllowedSeen),
      `scriptAllowed telemetry event: saw ${scriptAllowedSeen}`
    );
    let script_reported_event =
      Glean.unexpectedScriptLoad.scriptReported.testGetValue();
    if (script_reported_event && expected_results.should_have_report) {
      script_reported_event = script_reported_event[0];
      is(
        script_reported_event.extra.script_url,
        "https://example.net/script.js",
        "Should have recorded the script URL"
      );
      if (actions_to_take.report_email) {
        is(
          script_reported_event.extra.user_email,
          "test@example.com",
          "Should have recorded the email address"
        );
      } else {
        is(
          script_reported_event.extra.user_email,
          undefined,
          "Should not have recorded the email address"
        );
      }
      ok(true, "Should have recorded a scriptReported telemetry event");
    } else if (script_reported_event && !expected_results.should_have_report) {
      ok(false, "Should not have recorded a scriptReported telemetry event");
    } else if (!script_reported_event && expected_results.should_have_report) {
      ok(false, "Should have recorded a scriptReported telemetry event");
    } else if (!script_reported_event && !expected_results.should_have_report) {
      ok(true, "Should not have recorded a scriptReported telemetry event");
    } else {
      ok(false, "How did we get here?");
    }
  }, runTest);

  // Cleanup
  Services.prefs.clearUserPref(
    "security.block_parent_unrestricted_js_loads.temporary"
  );
  Services.prefs.clearUserPref("security.allow_parent_unrestricted_js_loads");

  await SpecialPowers.popPrefEnv();
}

add_task(async function test_block_workflow() {
  await runWorkflow({
    click_block: true,
    report: true,
    report_email: true,
    enable_telemetry: true,
  });
});

add_task(async function test_allow_workflow() {
  await runWorkflow({
    click_block: false,
    report: true,
    report_email: true,
  });
});

add_task(async function test_allow_with_no_report_workflow() {
  await runWorkflow({
    click_block: false,
    report: false,
    report_email: false,
  });
});

add_task(async function test_block_with_no_report_email_workflow() {
  await runWorkflow({
    click_block: true,
    report: true,
    report_email: false,
    enable_telemetry: true,
  });
});

add_task(async function test_block_workflow_no_telemetry() {
  await runWorkflow({
    click_block: true,
    report: true,
    report_email: true,
    enable_telemetry: false,
  });
});
