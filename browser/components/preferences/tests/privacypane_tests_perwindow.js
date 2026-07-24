// This file gets imported into the same scope as head.js.
/* import-globals-from head.js */

async function runTestOnPrivacyPrefPane(testFunc) {
  info("runTestOnPrivacyPrefPane entered");
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences",
    true,
    true
  );
  let browser = tab.linkedBrowser;
  info("loaded about:preferences");
  await browser.contentWindow.gotoPref("panePrivacy");
  info("viewing privacy pane, executing testFunc");
  await testFunc(browser.contentWindow);
  BrowserTestUtils.removeTab(tab);
}

function controlChanged(element) {
  element.doCommand();
}

// We can only test the panes that don't trigger a preference update
async function test_pane_visibility(win) {
  // Elements which should only be visible in history mode "custom".
  let customElementIds = [
    "privateBrowsingAutoStart",
    "rememberHistory",
    "rememberForms",
    "alwaysClear",
    "clearDataSettings",
  ];

  let historymode = win.document.getElementById("historyMode");
  ok(historymode, "history mode menulist should exist");

  await selectHistoryMode(win, "custom");

  for (let id of customElementIds) {
    let element = win.document.querySelector(
      `setting-group[groupid='history'] #${id}`
    );
    ok(element, `the ${id} element should exist`);
    is_element_visible(
      element,
      `the ${id} element should be visible in 'custom' mode`
    );
  }

  await selectHistoryMode(win, "remember");

  for (let id of customElementIds) {
    let element = win.document.querySelector(
      `setting-group[groupid='history'] #${id}`
    );
    ok(element, `the ${id} element should exist`);
    is_element_hidden(
      element,
      `the ${id} element should be hidden in 'remember' mode`
    );
  }
}

async function test_dependent_elements(win) {
  let historymode = win.document.getElementById("historyMode");
  ok(historymode, "history mode menulist should exist");
  let pbautostart = win.document.getElementById("privateBrowsingAutoStart");
  ok(pbautostart, "the private browsing auto-start checkbox should exist");
  let controls = [
    win.document.getElementById("rememberHistory"),
    win.document.getElementById("rememberForms"),
    win.document.getElementById("deleteOnClose"),
    win.document.getElementById("alwaysClear"),
  ];
  controls.forEach(function (control) {
    ok(control, "the dependent controls should exist");
  });
  let independents = [
    win.document.getElementById("contentBlockingBlockCookiesCheckbox"),
  ];
  independents.forEach(function (control) {
    ok(control, "the independent controls should exist");
  });
  let cookieexceptions = win.document.getElementById("cookieExceptions");
  ok(cookieexceptions, "the cookie exceptions button should exist");
  let deleteOnCloseCheckbox = win.document.getElementById("deleteOnClose");
  ok(deleteOnCloseCheckbox, "the delete on close checkbox should exist");
  let alwaysclear = win.document.getElementById("alwaysClear");
  ok(alwaysclear, "the clear data on close checkbox should exist");
  let rememberhistory = win.document.getElementById("rememberHistory");
  ok(rememberhistory, "the remember history checkbox should exist");
  let rememberforms = win.document.getElementById("rememberForms");
  ok(rememberforms, "the remember forms checkbox should exist");
  let alwaysclearsettings = win.document.getElementById("clearDataSettings");
  ok(alwaysclearsettings, "the clear data settings button should exist");

  function expect_disabled(disabled) {
    controls.forEach(function (control) {
      is(
        control.disabled,
        disabled,
        control.getAttribute("id") +
          " should " +
          (disabled ? "" : "not ") +
          "be disabled"
      );
    });
    if (disabled) {
      ok(
        !alwaysclear.checked,
        "the clear data on close checkbox value should be as expected"
      );
      ok(
        !rememberhistory.checked,
        "the remember history checkbox value should be as expected"
      );
      ok(
        !rememberforms.checked,
        "the remember forms checkbox value should be as expected"
      );
    }
  }
  function check_independents(expected) {
    independents.forEach(function (control) {
      is(
        control.disabled,
        expected,
        control.getAttribute("id") +
          " should " +
          (expected ? "" : "not ") +
          "be disabled"
      );
    });

    ok(
      !cookieexceptions.disabled,
      "the cookie exceptions button should never be disabled"
    );
    ok(
      alwaysclearsettings.disabled,
      "the clear data settings button should always be disabled"
    );
  }

  // controls should only change in custom mode
  await selectHistoryMode(win, "remember");
  expect_disabled(false);
  check_independents(false);

  // setting the mode to custom shouldn't change anything
  await selectHistoryMode(win, "custom");
  expect_disabled(false);
  check_independents(false);

  await selectHistoryMode(win, "remember");
}

async function test_dependent_elements_redesigned(win) {
  let historymode = win.document.getElementById("historyMode");
  ok(historymode, "history mode options should exist");

  let customButton = win.document.getElementById("customHistoryButton");
  ok(customButton, "advanced settings button should exist");

  // button should only change in custom mode
  ok(customButton.parentDisabled, "button is disabled in remember mode");

  // setting the mode to custom shouldn't change anything
  await selectRedesignedHistoryMode(win, "custom");
  ok(!customButton.parentDisabled, "button is enabled in custom mode");

  await selectRedesignedHistoryMode(win, "remember");
  ok(customButton.parentDisabled, "button is disabled in remember mode");
}

async function test_dependent_cookie_elements(win) {
  let deleteOnCloseCheckbox = win.document.getElementById("deleteOnClose");
  let deleteOnCloseNote = win.document.getElementById("deleteOnCloseInfo");
  let blockCookiesMenu = win.document.getElementById("blockCookiesMenu");

  let controls = [blockCookiesMenu, deleteOnCloseCheckbox];
  controls.forEach(function (control) {
    ok(control, "the dependent cookie controls should exist");
  });
  let blockCookiesCheckbox = win.document.getElementById(
    "contentBlockingBlockCookiesCheckbox"
  );
  ok(blockCookiesCheckbox, "the block cookies checkbox should exist");

  function expect_disabled(disabled, c = controls) {
    c.forEach(function (control) {
      is(
        control.disabled,
        disabled,
        control.getAttribute("id") +
          " should " +
          (disabled ? "" : "not ") +
          "be disabled"
      );
    });
  }

  blockCookiesCheckbox.checked = true;
  controlChanged(blockCookiesCheckbox);
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect_disabled(false);

  blockCookiesCheckbox.checked = false;
  controlChanged(blockCookiesCheckbox);
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect_disabled(true, [blockCookiesMenu]);
  expect_disabled(false, [deleteOnCloseCheckbox]);
  is_element_hidden(
    deleteOnCloseNote,
    "The notice for delete on close in permanent private browsing mode should be hidden."
  );

  blockCookiesMenu.value = "always";
  controlChanged(blockCookiesMenu);
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect_disabled(true, [deleteOnCloseCheckbox]);
  expect_disabled(false, [blockCookiesMenu]);
  is_element_hidden(
    deleteOnCloseNote,
    "The notice for delete on close in permanent private browsing mode should be hidden."
  );

  if (win.contentBlockingCookiesAndSiteDataRejectTrackersEnabled) {
    blockCookiesMenu.value = "trackers";
  } else {
    blockCookiesMenu.value = "unvisited";
  }
  controlChanged(blockCookiesMenu);
  await new Promise(resolve => requestAnimationFrame(resolve));
  expect_disabled(false);

  // The History mode setting for "never remember history" should still
  // disable the "keep cookies until..." menu.

  // Suppress restart prompt, because we can't restart in a mochitest.
  win._shouldPromptForRestartPBM = false;
  await selectHistoryMode(win, "dontremember");
  expect_disabled(true, [deleteOnCloseCheckbox]);
  is_element_visible(
    deleteOnCloseNote,
    "The notice for delete on close in permanent private browsing mode should be visible."
  );
  expect_disabled(false, [blockCookiesMenu]);

  // Suppress restart prompt, because we can't restart in a mochitest.
  win._shouldPromptForRestartPBM = false;

  await selectHistoryMode(win, "remember");
  expect_disabled(false);
  is_element_hidden(
    deleteOnCloseNote,
    "The notice for delete on close in permanent private browsing mode should be hidden."
  );
}

async function test_dependent_clearonclose_elements(win) {
  let historymode = win.document.getElementById("historyMode");
  ok(historymode, "history mode menulist should exist");
  let pbautostart = win.document.getElementById("privateBrowsingAutoStart");
  ok(pbautostart, "the private browsing auto-start checkbox should exist");
  let alwaysclear = win.document.getElementById("alwaysClear");
  ok(alwaysclear, "the clear data on close checkbox should exist");
  let alwaysclearsettings = win.document.getElementById("clearDataSettings");
  ok(alwaysclearsettings, "the clear data settings button should exist");

  function expect_disabled(disabled) {
    is(
      alwaysclearsettings.disabled,
      disabled,
      "the clear data settings should " +
        (disabled ? "" : "not ") +
        "be disabled"
    );
  }

  await selectHistoryMode(win, "custom");
  await updateCheckBox(win, "privateBrowsingAutoStart", false);

  await updateCheckBox(win, "alwaysClear", false);
  expect_disabled(true);

  await updateCheckBox(win, "alwaysClear", true);
  expect_disabled(false);

  await updateCheckBox(win, "alwaysClear", false);
  expect_disabled(true);
}

async function test_dependent_prefs(win) {
  let historymode = win.document.getElementById("historyMode");
  ok(historymode, "history mode menulist should exist");
  let controls = [
    win.document.getElementById("rememberHistory"),
    win.document.getElementById("rememberForms"),
  ];
  controls.forEach(function (control) {
    ok(control, "the micro-management controls should exist");
  });

  function expect_checked(checked) {
    controls.forEach(function (control) {
      is(
        control.checked,
        checked,
        control.getAttribute("id") +
          " should " +
          (checked ? "" : "not ") +
          "be checked"
      );
    });
  }

  // controls should be checked in remember mode
  await selectHistoryMode(win, "remember");
  // Initial updates from prefs are not sync, so wait:
  await TestUtils.waitForCondition(() => controls[0].checked);
  expect_checked(true);

  // even if they're unchecked in custom mode
  await selectHistoryMode(win, "custom");

  for (let control of controls) {
    await updateCheckBox(win, control.id, false);
  }
  expect_checked(false);
  await selectHistoryMode(win, "remember");
  expect_checked(true);
}

function test_historymode_retention(mode, expect) {
  return async function test_historymode_retention_fn(win) {
    let historymode = win.document.getElementById("historyMode");
    ok(historymode, "history mode menulist should exist");

    if (
      (historymode.value == "remember" && mode == "dontremember") ||
      (historymode.value == "dontremember" && mode == "remember") ||
      (historymode.value == "custom" && mode == "dontremember")
    ) {
      return;
    }

    if (expect !== undefined) {
      is(
        historymode.value,
        expect,
        "history mode is expected to remain " + expect
      );
    }

    await selectHistoryMode(win, mode);
  };
}

function test_historymode_retention_redesign(mode, expect) {
  return async function test_historymode_retention_fn(win) {
    let historymode = win.document.getElementById("historyMode");
    ok(historymode, "history mode menulist should exist");

    if (
      (historymode.value == "remember" && mode == "dontremember") ||
      (historymode.value == "dontremember" && mode == "remember") ||
      (historymode.value == "custom" && mode == "dontremember")
    ) {
      return;
    }

    if (expect !== undefined) {
      is(
        historymode.value,
        expect,
        "history mode is expected to remain " + expect
      );
    }

    await selectRedesignedHistoryMode(win, mode);
  };
}

function test_custom_retention(controlToChange, expect, valueIncrement) {
  return async function test_custom_retention_fn(win) {
    let historymode = win.document.getElementById("historyMode");
    ok(historymode, "history mode menulist should exist");

    if (expect !== undefined) {
      is(
        historymode.value,
        expect,
        "history mode is expected to remain " + expect
      );
    }

    await selectHistoryMode(win, "custom");

    controlToChange = win.document.getElementById(controlToChange);
    ok(controlToChange, "the control to change should exist");
    switch (controlToChange.localName) {
      case "checkbox":
        await updateCheckBox(win, controlToChange.id, !controlToChange.checked);
        break;
      case "menulist":
        await selectHistoryMode(win, valueIncrement);
        break;
    }
  };
}

function test_custom_retention_redesign(
  controlToChange,
  expect,
  valueIncrement
) {
  return async function test_custom_retention_fn(win) {
    let historymode = win.document.getElementById("historyMode");
    ok(historymode, "history mode options should exist");

    if (expect !== undefined) {
      is(
        historymode.value,
        expect,
        "history mode is expected to remain " + expect
      );
    }

    await selectRedesignedHistoryMode(win, "custom");

    // Navigate to the custom subpane
    let paneChange = waitForPaneChange("history");
    let customButton = win.document.getElementById("customHistoryButton");
    customButton.click();
    await paneChange;

    controlToChange = win.document.querySelector(
      `setting-group[groupid='historyAdvanced'] #${controlToChange}`
    );
    ok(controlToChange, "the control to change should exist");
    switch (controlToChange.localName) {
      case "moz-checkbox":
        await updateCheckBoxElement(controlToChange, !controlToChange.checked);
        break;
      case "menulist":
        await selectRedesignedHistoryMode(win, valueIncrement);
        break;
    }
  };
}

const gPrefCache = new Map();

function cache_preferences(win) {
  let prefs = win.Preferences.getAll();
  for (let pref of prefs) {
    gPrefCache.set(pref.id, pref.value);
  }
}

function reset_preferences(win) {
  let prefs = win.Preferences.getAll();
  // Avoid assigning undefined, which means clearing a "user"/test pref value
  for (let pref of prefs) {
    if (gPrefCache.has(pref.id)) {
      pref.value = gPrefCache.get(pref.id);
    }
  }
}

function run_test_subset(subset) {
  info("subset: " + Array.from(subset, x => x.name).join(",") + "\n");
  let tests = [cache_preferences, ...subset, reset_preferences];
  for (let test of tests) {
    add_task(runTestOnPrivacyPrefPane.bind(undefined, test));
  }
}
