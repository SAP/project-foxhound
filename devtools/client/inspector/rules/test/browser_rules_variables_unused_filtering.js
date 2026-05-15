/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testUnusedVariablesAndFiltering() {
  const declarations = [
    {
      name: "--my-var-1",
      value: `a`,
    },
    {
      name: "--my-var-2",
      value: `b`,
    },
    // Generate a good amount of variables that won't be referenced anywhere to trigger the
    // "hide unused" mechanism
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `--unused-${i}`,
      value: i.toString(),
    })),
    {
      name: "--x",
      value: `hotpink`,
    },
  ];

  const TEST_URI = `
  <style>
    h1 {
      ${declarations.map(({ name, value }) => `${name}: ${value};`).join("\n")}
    }
  </style>
  <h1>Hello</h1>
`;

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [],
    },
  ]);
  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 13 unused custom CSS properties",
    "Show unused variables has expected text"
  );

  info("Check that searching for hidden variables show them");
  await setSearchFilter(view, "--my-var");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "--my-var-1",
          value: `a`,
          highlighted: true,
        },
        {
          name: "--my-var-2",
          value: `b`,
          highlighted: true,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 11 unused custom CSS properties",
    "Show unused variables has expected text"
  );

  info("Check that clearing the filter doesn't hide the results back");
  const searchClearButton = view.searchClearButton;

  info("Clearing the search filter");
  const onRuleviewFiltered = view.inspector.once("ruleview-filtered");
  EventUtils.synthesizeMouseAtCenter(searchClearButton, {}, view.styleWindow);
  await onRuleviewFiltered;

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "--my-var-1",
          value: `a`,
          highlighted: false,
        },
        {
          name: "--my-var-2",
          value: `b`,
          highlighted: false,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 11 unused custom CSS properties",
    "Show unused variables has expected text"
  );

  info("Check that searching for value of hidden variables do show them");
  await setSearchFilter(view, "pink");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        {
          name: "--my-var-1",
          value: `a`,
          highlighted: false,
        },
        {
          name: "--my-var-2",
          value: `b`,
          highlighted: false,
        },
        {
          name: "--x",
          value: `hotpink`,
          highlighted: true,
        },
      ],
    },
  ]);

  is(
    getUnusedVariableButton(view, 1).textContent,
    "Show 10 unused custom CSS properties",
    "Show unused variables has expected text"
  );

  info("Check that Tab key navigation works as expected");
  // Here we're in a state where we have hidden variables that should be between
  // --my-var-2 and --x (all the --unused-* ones).
  // Since keyboard navigation with Tab between editor is based on the declarations, let's
  // check that we properly navigate with the visible items

  const myVar2Prop = getTextProperty(view, 1, { "--my-var-2": "b" });
  const myXProp = getTextProperty(view, 1, { "--x": "hotpink" });

  info("focus --my-var-2 value");
  await focusEditableField(view, myVar2Prop.editor.valueSpan);

  info("hit tab");
  const ruleEditor = getRuleViewRuleEditor(view, 1);
  let onFocus = once(ruleEditor.element, "focus", true);
  let onRuleViewChanged = view.once("ruleview-changed");
  EventUtils.synthesizeKey("VK_TAB", {}, view.styleWindow);
  await onFocus;
  await onRuleViewChanged;

  is(
    inplaceEditor(view.styleDocument.activeElement),
    inplaceEditor(myXProp.editor.nameSpan),
    "--x name input is focused"
  );

  info("hit shift + tab");
  onFocus = once(ruleEditor.element, "focus", true);
  EventUtils.synthesizeKey("VK_TAB", { shiftKey: true }, view.styleWindow);
  await onFocus;

  is(
    inplaceEditor(view.styleDocument.activeElement),
    inplaceEditor(myVar2Prop.editor.valueSpan),
    "--my-var-2 value input is focused"
  );

  // Blur the field to put back the UI in its initial state (and avoid pending
  // requests when the test ends).
  onRuleViewChanged = view.once("ruleview-changed");
  EventUtils.synthesizeKey("VK_ESCAPE", {}, view.styleWindow);
  view.debounce.flush();
  await onRuleViewChanged;

  info(
    "Check that clicking on the Show unused button does show all the variables at the expected positions"
  );
  getUnusedVariableButton(view, 1).click();

  is(
    getUnusedVariableButton(view, 1),
    null,
    "Show unused variable button is not visible anymore"
  );
  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: declarations.map(({ name, value }) => ({
        name,
        value,
        // We didn't clear the search, --x should still be highlighted
        highlighted: name === "--x",
      })),
    },
  ]);
});
