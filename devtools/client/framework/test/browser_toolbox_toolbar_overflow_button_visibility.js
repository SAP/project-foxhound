/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the toolbox tabs rearrangement when the visibility of toolbox buttons were changed.

const { Toolbox } = require("resource://devtools/client/framework/toolbox.js");

add_task(async function () {
  const tab = await addTab("about:blank");
  const toolbox = await openToolboxForTab(
    tab,
    "options",
    Toolbox.HostType.BOTTOM
  );
  const toolboxButtonPreferences = toolbox.toolbarButtons.map(
    button => button.visibilityswitch
  );

  const win = getWindow(toolbox);
  const { outerWidth: originalWindowWidth, outerHeight: originalWindowHeight } =
    win;
  registerCleanupFunction(() => {
    for (const preference of toolboxButtonPreferences) {
      Services.prefs.clearUserPref(preference);
    }

    win.resizeTo(originalWindowWidth, originalWindowHeight);
  });

  const optionsTool = toolbox.getCurrentPanel();
  const checkButtons = optionsTool.panelWin.document.querySelectorAll(
    "#enabled-toolbox-buttons-box input[type=checkbox]"
  );

  info(
    "Test the count of shown devtools tab after making all buttons to be visible"
  );
  await resizeWindow(toolbox, 800);

  // Bug 1770282 - On MacOS the tabs aren't available right away and could cause intermittent failure
  await waitFor(() => {
    return !!toolbox.doc.querySelector(".devtools-tab");
  });

  // Once, make all toolbox button to be invisible.
  await setToolboxButtonsVisibility(toolbox, checkButtons, false);
  // Get count of shown devtools tab elements.
  const initialTabCount = toolbox.doc.querySelectorAll(".devtools-tab").length;
  // Make all toolbox button to be visible.
  await setToolboxButtonsVisibility(toolbox, checkButtons, true);
  Assert.less(
    toolbox.doc.querySelectorAll(".devtools-tab").length,
    initialTabCount,
    "Count of shown devtools tab should decreased"
  );

  info(
    "Test the count of shown devtools tab after making all buttons to be invisible"
  );
  await setToolboxButtonsVisibility(toolbox, checkButtons, false);
  is(
    toolbox.doc.querySelectorAll(".devtools-tab").length,
    initialTabCount,
    "Count of shown devtools tab should be same to 1st count"
  );
});

async function setToolboxButtonsVisibility(toolbox, checkButtons, doVisible) {
  for (const checkButton of checkButtons) {
    if (checkButton.checked === doVisible) {
      continue;
    }

    const onTracerPrefApplied = toolbox.once("new-configuration-applied");

    checkButton.click();

    // Toggling the devtools.command-button-jstracer.enabled preference
    // will trigger the update of thread configuration from the toolbox module
    // and we need to wait for its completion to avoid pending request at end of test
    if (checkButton.id == "command-button-jstracer") {
      await onTracerPrefApplied;
    }
  }
}
