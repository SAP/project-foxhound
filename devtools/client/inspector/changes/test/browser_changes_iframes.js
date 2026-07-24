/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that updating declarations on pages with iframes works fine.

const TEST_URI = `
  <h1 style="color: red">test</h1>
  <iframe src="data:text/html,${encodeURIComponent(`<h2 style="background-color: hotpink">iframe</h2>`)}"></iframe>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view: ruleView } = await openRuleView();
  const { document: doc, store } = await selectChangesView(inspector);

  info("Change the top-level h1 inline style color from red to blue");
  await selectNode("h1", inspector);
  await editDeclarationValue({
    ruleView,
    store,
    ruleIndex: 0,
    declaration: { color: "red" },
    newValue: "blue",
  });

  info("Check that the changes are properly displayed");
  await waitFor(() => getAddedDeclarations(doc).at(-1)?.value === "blue");

  Assert.deepEqual(
    getRemovedDeclarations(doc).map(declaration => ({
      property: declaration.property,
      value: declaration.value,
    })),
    [
      {
        property: "color",
        value: "red",
      },
    ],
    "Only one declaration was tracked as removed (color: red)"
  );

  Assert.deepEqual(
    getAddedDeclarations(doc).map(declaration => ({
      property: declaration.property,
      value: declaration.value,
    })),
    [
      {
        property: "color",
        value: "blue",
      },
    ],
    "Only one declaration was tracked as added (color: blue)"
  );

  info(
    "Change the iframe h2 inline style background-color from hotpink to green"
  );
  await selectNodeInFrames(["iframe", "h2"], inspector);
  await editDeclarationValue({
    ruleView,
    store,
    ruleIndex: 0,
    declaration: { "background-color": "hotpink" },
    newValue: "green",
  });

  info("Check that the changes in the iframe are properly displayed");
  await waitFor(() => getAddedDeclarations(doc).at(-1)?.value === "green");

  Assert.deepEqual(
    getRemovedDeclarations(doc).map(declaration => ({
      property: declaration.property,
      value: declaration.value,
    })),
    [
      {
        property: "color",
        value: "red",
      },
      {
        property: "background-color",
        value: "hotpink",
      },
    ],
    "The iframe declaration was tracked as removed (background-color: hotpink)"
  );

  Assert.deepEqual(
    getAddedDeclarations(doc).map(declaration => ({
      property: declaration.property,
      value: declaration.value,
    })),
    [
      {
        property: "color",
        value: "blue",
      },
      {
        property: "background-color",
        value: "green",
      },
    ],
    "The iframe declaration was tracked as added (background-color: green)"
  );
});

async function editDeclarationValue({
  ruleView,
  store,
  ruleIndex,
  declaration,
  newValue,
}) {
  const h1ColorProp = getTextProperty(ruleView, ruleIndex, declaration);

  // Focus the value input
  focusEditableField(ruleView, h1ColorProp.editor.valueSpan);

  // Type one letter at a time and wait for the TRACK_CHANGE action
  for (const letter of newValue) {
    const onTrackChange = waitForDispatch(store, "TRACK_CHANGE");
    const onRuleViewChanged = ruleView.once("ruleview-changed");
    EventUtils.sendString(letter, ruleView.styleWindow);
    // Flush the debounce for the preview text.
    ruleView.debounce.flush();
    await onTrackChange;
    await onRuleViewChanged;
  }

  const onRuleViewChanged = ruleView.once("ruleview-changed");
  EventUtils.synthesizeKey("VK_RETURN", {}, ruleView.styleWindow);
  ruleView.debounce.flush();
  await onRuleViewChanged;
}
