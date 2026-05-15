/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view marks overridden rules correctly if a property gets
// disabled

const TEST_URI = `
  <style type='text/css'>
  #testid {
    background-color: blue;
  }
  .testclass {
    background-color: green;
  }
  </style>
  <div id='testid' class='testclass'>Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  const idProp = getTextProperty(view, 1, { "background-color": "blue" });
  const classProp = getTextProperty(view, 2, { "background-color": "green" });

  ok(classProp.overridden, "Class prop is overridden at first.");
  ok(
    classProp.editor.filterProperty,
    "filter button is rendered for class prop"
  );
  is(
    classProp.editor.filterProperty.hidden,
    false,
    "filter button isn't hidden"
  );

  await togglePropStatus(view, idProp);
  ok(
    !classProp.overridden,
    "Class prop should not be overridden after id prop was disabled."
  );
  is(
    classProp.editor.filterProperty.hidden,
    true,
    "filter button is hidden for class prop after id prop was disabled"
  );

  await togglePropStatus(view, idProp);
  ok(
    classProp.overridden,
    "Class prop is overridden again after id prop was re-enabled."
  );
  is(
    classProp.editor.filterProperty.hidden,
    false,
    "filter button isn't hidden for class prop after id prop was re-enabled"
  );
});
