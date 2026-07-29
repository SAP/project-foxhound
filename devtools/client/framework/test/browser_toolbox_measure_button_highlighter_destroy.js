/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TYPES: HIGHLIGHTER_TYPES } = ChromeUtils.importESModule(
  "resource://devtools/shared/highlighters.mjs"
);

const TEST_URL = `data:text/html;charset=utf8,${encodeURIComponent(`
  test for measuring tool highlighter destruction when button is disabled
  <div id='test-element' style='width: 200px; height: 200px; background-color: blue;'></div>
`)}`;

const MEASURE_VISIBILITY_PREF = "devtools.command-button-measure.enabled";
registerCleanupFunction(() => {
  Services.prefs.clearUserPref(MEASURE_VISIBILITY_PREF);
});

// Test that the measuring tool highlighter is properly destroyed when the
// toolbar button is disabled.
add_task(async function test() {
  const tab = await addTab(TEST_URL);
  const toolbox = await gDevTools.showToolboxForTab(tab);

  await testMeasuringToolHighlighterDestroyed(toolbox);

  await toolbox.destroy();
});

async function testMeasuringToolHighlighterDestroyed(toolbox) {
  info("Enabling the measure button");
  const checkbox = await getMeasureCheckbox(toolbox);
  if (!checkbox.checked) {
    checkbox.click();
    await waitForMeasureButtonInDOM(toolbox, true);
  }
  await toolbox.selectTool("inspector");
  let inspectorFront = await toolbox.target.getFront("inspector");

  info("Activating the measuring tool");
  await activateMeasureButton(toolbox);
  await waitForHighlighterState(inspectorFront, true);
  ok(
    inspectorFront.getKnownHighlighter(HIGHLIGHTER_TYPES.MEASURING)?.isShown(),
    "Measuring tool highlighter is shown"
  );

  info("Disabling the measure button via preferences");
  const disableCheckbox = await getMeasureCheckbox(toolbox);
  disableCheckbox.click();
  await waitForMeasureButtonInDOM(toolbox, false);
  await waitForHighlighterState(inspectorFront, false);
  ok(
    !inspectorFront.getKnownHighlighter(HIGHLIGHTER_TYPES.MEASURING)?.isShown(),
    "Measuring tool highlighter is hidden after button disabled"
  );

  info("Re-enabling the measure button");
  disableCheckbox.click();
  await waitForMeasureButtonInDOM(toolbox, true);
  await toolbox.selectTool("inspector");

  await activateMeasureButton(toolbox);
  await waitForHighlighterState(inspectorFront, true);
  ok(
    inspectorFront.getKnownHighlighter(HIGHLIGHTER_TYPES.MEASURING)?.isShown(),
    "Measuring tool highlighter is shown again after re-enabling"
  );

  info("Reload the page");
  await reloadSelectedTab();
  inspectorFront = await toolbox.target.getFront("inspector");
  is(
    inspectorFront.getKnownHighlighter(HIGHLIGHTER_TYPES.MEASURING),
    undefined,
    "Highlighter doesn't exist anymore after reloading"
  );
  ok(
    !isButtonActive(getMeasureButtonInDOM(toolbox)),
    "Measure button isn't active after reloading the page"
  );
  await activateMeasureButton(toolbox);
  await waitForHighlighterState(inspectorFront, true);
  ok(
    inspectorFront.getKnownHighlighter(HIGHLIGHTER_TYPES.MEASURING)?.isShown(),
    "Measuring tool highlighter can be displayed after reloading"
  );
}

async function selectOptionsPanel(toolbox) {
  info("Selecting the options panel");

  const onOptionsSelected = toolbox.once("options-selected");
  toolbox.selectTool("options");
  const optionsPanel = await onOptionsSelected;
  return optionsPanel.panelWin;
}

async function getMeasureCheckbox(toolbox) {
  const optionsPanelWin = await selectOptionsPanel(toolbox);
  const checkbox = optionsPanelWin.document.querySelector(
    "#command-button-measure"
  );
  if (!checkbox) {
    throw new Error("Couldn't find the measure button checkbox in options");
  }
  return checkbox;
}

function getMeasureButtonInDOM(toolbox) {
  return toolbox.doc.querySelector("#command-button-measure");
}

async function waitForMeasureButtonInDOM(toolbox, shouldExist) {
  await waitFor(() => {
    const button = getMeasureButtonInDOM(toolbox);
    return shouldExist ? button !== null : button === null;
  });
}

async function activateMeasureButton(toolbox) {
  const button = getMeasureButtonInDOM(toolbox);
  if (!button) {
    throw new Error("Couldn't find the measure button");
  }
  const activated = waitFor(() => isButtonActive(button));
  button.click();
  await activated;
}

function isButtonActive(button) {
  return button.classList.contains("checked");
}

async function waitForHighlighterState(inspectorFront, shouldBeShown) {
  await waitFor(() => {
    const highlighter = inspectorFront.getKnownHighlighter(
      HIGHLIGHTER_TYPES.MEASURING
    );
    return shouldBeShown ? highlighter?.isShown() : !highlighter?.isShown();
  });
}
