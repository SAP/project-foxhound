/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that CSS property values are autocompleted and cycled
// correctly when editing an existing property in the rule view.

// format :
//  [
//    what key to press,
//    modifers,
//    expected input box value after keypress,
//    flags:
//      - is the popup open,
//      - is a suggestion selected in the popup,
//      - expect ruleview-changed,
//      - expect grid-line-names-updated and popup to be closed and reopened,
//  ]

const NONE = 0;
const OPEN = 1;
const SELECTED = 2;
const CHANGE = 4;
const SUBMIT_PROPERTY_NAME = 8;

const changeTestData = [
  ["c", {}, "col1-start", OPEN | SELECTED | CHANGE],
  ["o", {}, "col1-start", OPEN | SELECTED | CHANGE],
  ["l", {}, "col1-start", OPEN | SELECTED | CHANGE],
  ["VK_DOWN", {}, "col2-start", OPEN | SELECTED | CHANGE],
  ["VK_RIGHT", {}, "col2-start", NONE],
];

// Creates a new CSS property value.
// Checks that grid-area autocompletes column and row names.
const newAreaTestData = [
  ["g", {}, "gap", OPEN | SELECTED],
  ["VK_DOWN", {}, "grid", OPEN | SELECTED],
  ["VK_DOWN", {}, "grid-area", OPEN | SELECTED],
  // When hitting Tab, the popup on the property name gets closed and the one on the
  // property value opens (with the grid area names), without auto-selecting an item.
  ["VK_TAB", {}, "", OPEN | SUBMIT_PROPERTY_NAME],
  ["c", {}, "col1-start", OPEN | SELECTED | CHANGE],
  ["VK_BACK_SPACE", {}, "c", CHANGE],
  ["VK_BACK_SPACE", {}, "", OPEN | CHANGE],
  ["r", {}, "revert", OPEN | SELECTED | CHANGE],
  ["VK_DOWN", {}, "revert-layer", OPEN | SELECTED | CHANGE],
  ["VK_DOWN", {}, "row1-start", OPEN | SELECTED | CHANGE],
  ["r", {}, "rr", CHANGE],
  ["VK_BACK_SPACE", {}, "r", CHANGE],
  ["o", {}, "row1-start", OPEN | SELECTED | CHANGE],
  ["VK_TAB", {}, "", CHANGE],
];

// Creates a new CSS property value.
// Checks that grid-row only autocompletes row names.
const newRowTestData = [
  ["g", {}, "gap", OPEN | SELECTED],
  ["r", {}, "grid", OPEN | SELECTED],
  ["i", {}, "grid", OPEN | SELECTED],
  ["d", {}, "grid", OPEN | SELECTED],
  ["-", {}, "grid-area", OPEN | SELECTED],
  ["r", {}, "grid-row", OPEN | SELECTED],
  // When hitting Tab, the popup on the property name gets closed and the one on the
  // property value opens (with the grid area names), without auto-selecting an item.
  ["VK_TAB", {}, "", OPEN | SUBMIT_PROPERTY_NAME],
  ["c", {}, "c", CHANGE],
  ["VK_BACK_SPACE", {}, "", OPEN | CHANGE],
  ["r", {}, "revert", OPEN | SELECTED | CHANGE],
  ["VK_DOWN", {}, "revert-layer", OPEN | SELECTED | CHANGE],
  ["VK_DOWN", {}, "row1-start", OPEN | SELECTED | CHANGE],
  ["VK_TAB", {}, "", CHANGE],
];

const TEST_URL = URL_ROOT + "doc_grid_names.html";

add_task(async function () {
  await addTab(TEST_URL);
  const { toolbox, inspector, view } = await openRuleView();

  info("Test autocompletion changing a preexisting property");
  await runChangePropertyAutocompletionTest(
    toolbox,
    inspector,
    view,
    changeTestData
  );

  info("Test autocompletion creating a new property");
  await runNewPropertyAutocompletionTest(
    toolbox,
    inspector,
    view,
    newAreaTestData
  );

  info("Test autocompletion creating a new property");
  await runNewPropertyAutocompletionTest(
    toolbox,
    inspector,
    view,
    newRowTestData
  );
});

async function runNewPropertyAutocompletionTest(
  toolbox,
  inspector,
  view,
  testData
) {
  info("Selecting the test node");
  await selectNode("#cell2", inspector);

  info("Focusing the css property editable field");
  const ruleEditor = getRuleViewRuleEditor(view, 0);
  const editor = await focusNewRuleViewProperty(ruleEditor);

  info("Starting to test for css property completion");
  for (const data of testData) {
    await testCompletion(data, editor, view);
  }
}

async function runChangePropertyAutocompletionTest(
  toolbox,
  inspector,
  view,
  testData
) {
  info("Selecting the test node");
  await selectNode("#cell3", inspector);

  const ruleEditor = getRuleViewRuleEditor(view, 1).rule;
  const prop = ruleEditor.textProps[0];

  info("Focusing the css property editable value");
  const gridLineNamesUpdated = inspector.once("grid-line-names-updated");
  let editor = await focusEditableField(view, prop.editor.valueSpan);
  await gridLineNamesUpdated;

  info("Starting to test for css property completion");
  for (const data of testData) {
    // Re-define the editor at each iteration, because the focus may have moved
    // from property to value and back
    editor = inplaceEditor(view.styleDocument.activeElement);
    await testCompletion(data, editor, view);
  }
}

async function testCompletion(
  [key, modifiers, completion, flags],
  editor,
  view
) {
  const open = !!(flags & OPEN);
  const selected = !!(flags & SELECTED);
  const change = !!(flags & CHANGE);
  const submitPropertyName = !!(flags & SUBMIT_PROPERTY_NAME);

  info(
    `Pressing key "${key}", expecting "${completion}", popup opened: ${open}, item selected: ${selected}`
  );

  const promises = [];

  if (change) {
    // If the key triggers a ruleview-changed, wait for that event, it will
    // always be the last to be triggered and tells us when the preview has
    // been done.
    promises.push(view.once("ruleview-changed"));
  } else if (key !== "VK_RIGHT" && key !== "VK_BACK_SPACE") {
    // Otherwise, expect an after-suggest event (except if the autocomplete gets dismissed).
    promises.push(editor.once("after-suggest"));
  }

  // If the key submits the property name, the popup gets closed, the editor for the
  // property value is created and the popup (with the grid line names) is opened.
  if (submitPropertyName) {
    promises.push(
      // So we need to listen for the popup being closed…
      editor.popup.once("popup-closed"),
      // … and opened again
      editor.popup.once("popup-opened"),
      // and check that the grid line names were updated
      view.inspector.once("grid-line-names-updated")
    );
  } else if (editor.popup.isOpen !== open) {
    // if the key does not submit the property name, we only want to wait for popup
    // events if the current state of the popup is different from the one that is
    // expected after
    promises.push(editor.popup.once(open ? "popup-opened" : "popup-closed"));
  }

  info(
    `Synthesizing key "${key}", modifiers: ${JSON.stringify(Object.keys(modifiers))}`
  );

  EventUtils.synthesizeKey(key, modifiers, view.styleWindow);

  // Flush the debounce for the preview text.
  view.debounce.flush();

  // Wait for all the events
  await Promise.all(promises);

  // The key might have been a TAB or shift-TAB, in which case the editor will
  // be a new one
  editor = inplaceEditor(view.styleDocument.activeElement);

  info("Checking the state");
  if (completion !== null) {
    try {
      await waitFor(() => editor.input.value === completion);
    } catch (e) {
      // catch the exception so we'll get a nicer failure in the assertion below
    }
    is(editor.input.value, completion, "Correct value is autocompleted");
  }

  if (!open) {
    ok(!(editor.popup && editor.popup.isOpen), "Popup is closed");
  } else {
    ok(editor.popup.isOpen, "Popup is open");
    is(editor.popup.selectedIndex !== -1, selected, "An item is selected");
  }
}
