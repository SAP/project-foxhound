/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that commented properties can be added and are disabled.

const TEST_URI = "<div id='testid'></div>";

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);
  info("Test creating a new set of commented and uncommented properties");

  info("Focusing a new property name in the rule-view");
  const ruleEditor = getRuleViewRuleEditor(view, 0);
  const editor = await focusEditableField(view, ruleEditor.closeBrace);
  is(
    inplaceEditor(ruleEditor.newPropSpan),
    editor,
    "The new property editor has focus"
  );

  info(
    "Entering a commented property/value pair into the property name editor"
  );
  const input = editor.input;
  input.value = `color: blue;
                 /* background-color: yellow; */
                 width: 200px;
                 height: 100px;
                 /* padding-bottom: 1px; */`;

  info("Pressing return to commit and focus the new value field");
  const onModifications = view.once("ruleview-changed");
  EventUtils.synthesizeKey("VK_RETURN", {}, view.styleWindow);
  await onModifications;
  // Hitting Enter focuses a new empty declaration, blur the input so we don't have
  // to deal with it.
  view.styleDocument.activeElement.blur();

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      declarations: [
        {
          name: "color",
          value: "blue",
          dirty: true,
        },
        {
          name: "background-color",
          value: "yellow",
          dirty: true,
          enabled: false,
          // disabled declarations use the same class as we do for "overridden"
          overridden: true,
        },
        {
          name: "width",
          value: "200px",
          dirty: true,
        },
        {
          name: "height",
          value: "100px",
          dirty: true,
        },
        {
          name: "padding-bottom",
          value: "1px",
          enabled: false,
          // disabled declarations use the same class as we do for "overridden"
          overridden: true,
          dirty: true,
        },
      ],
    },
  ]);
});
