/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function testHiddenUnusedVariables() {
  const h1Declarations = [
    { name: "--foo", value: "1" },
    { name: "--bar", value: "2" },
    { name: "--foobar", value: "calc( var(--foo, 3) * var(--bar, 4))" },
    { name: "--fallback", value: "var(--fallback-a)" },
    { name: "--fallback-a", value: "var(--fallback-b)" },
    { name: "--fallback-b", value: "var(--fallback-c)" },
    { name: "--fallback-c", value: "10" },
    { name: "--cycle-a", value: "var(--cycle-b)" },
    { name: "--cycle-b", value: "var(--cycle-a)" },
    { name: "--unused-a", value: "var(--unused-b)" },
    { name: "--unused-b", value: "5" },
    { name: "--h", value: "400px" },
    // Generate a good amount of variables that won't be referenced anywhere to trigger the
    // "hide unused" mechanism
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `--unused-no-dep-${i}`,
      value: i.toString(),
    })),
    {
      name: "width",
      value: `calc(var(--foobar, var(--fallback)) + var(--cycle-a) + var(--unset))`,
    },
  ];

  // set a different rule using a variable from the first rule to check if its detected
  // as being used
  const whereH1Declarations = [
    // declare 9 unused variables, so they should be visible by default
    ...Array.from({ length: 9 }, (_, i) => ({
      name: `--unused-where-${i}`,
      value: i.toString(),
    })),
    {
      name: "height",
      // Using variable for the h1 rule
      value: "var(--h)",
    },
  ];

  const TEST_URI = `
  <style>
    h1 {
      ${h1Declarations
        .map(({ name, value }) => `${name}: ${value};`)
        .join("\n")}
    }

    :where(h1) {
      ${whereH1Declarations
        .map(({ name, value }) => `${name}: ${value};`)
        .join("\n")}
    }
  </style>
  <h1>Hello</h1>
`;

  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("h1", inspector);

  info("Check that elementStyle.usedVariables has the expected data");
  Assert.deepEqual(Array.from(view.elementStyle.usedVariables), [
    // in `h1 -> width`
    "--foobar",
    // in `h1 -> width`
    "--fallback",
    // in `h1 -> width`
    "--cycle-a",
    // in `h1 -> width`, is picked up even if it's not defined
    "--unset",
    // in `:where(h1) -> height`
    "--h",
    // in `h1 -> --foobar`, which is used in `h1 -> width`
    "--foo",
    // in `h1 -> --foobar`, which is used in `h1 -> width`
    "--bar",
    // in `h1 -> --fallback`, which is used in `h1 -> width`
    "--fallback-a",
    // in `h1 -> --fallback-a`, which is used in `h1 -> --fallback`, which is used in `h1 -> width`
    "--fallback-b",
    // in `h1 -> --fallback-b`, which is used in `h1 -> --fallback-a`, which is used in `h1 -> --fallback`,
    // which is used in `h1 -> width`
    "--fallback-c",
    // in `h1 --cycle-a`, which is used in `h1 -> width`
    "--cycle-b",
  ]);

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [
        { name: "--foo", value: "1" },
        { name: "--bar", value: "2" },
        { name: "--foobar", value: "calc( var(--foo, 3) * var(--bar, 4))" },
        { name: "--fallback", value: "var(--fallback-a)" },
        { name: "--fallback-a", value: "var(--fallback-b)" },
        { name: "--fallback-b", value: "var(--fallback-c)" },
        { name: "--fallback-c", value: "10" },
        { name: "--cycle-a", value: "var(--cycle-b)" },
        { name: "--cycle-b", value: "var(--cycle-a)" },
        // Displayed because used in `:where(h1) -> height`
        { name: "--h", value: "400px" },
        {
          name: "width",
          value: `calc(var(--foobar, var(--fallback)) + var(--cycle-a) + var(--unset))`,
        },
      ],
    },
    {
      selector: ":where(h1)",
      // All declarations are displayed, even the unused variables, because we don't
      // hit the threshold to trigger the "hide unused" UI
      declarations: whereH1Declarations,
    },
  ]);

  info("Check that the 'Show X unused variables button is displayed'");
  const showUnusedVariablesButton = getUnusedVariableButton(view, 1);
  ok(!!showUnusedVariablesButton, "Show unused variables button is displayed");

  info("Check that the button doesn't prevent the usual keyboard navigation");
  const h1RuleEditor = getRuleViewRuleEditor(view, 1);
  const whereH1RuleEditor = getRuleViewRuleEditor(view, 2);

  await focusNewRuleViewProperty(h1RuleEditor);

  EventUtils.synthesizeKey("VK_TAB", {}, view.styleWindow);
  is(
    inplaceEditor(view.styleDocument.activeElement),
    inplaceEditor(whereH1RuleEditor.selectorText),
    "Hitting Tab triggered the editor for the selector of the next rule"
  );

  EventUtils.synthesizeKey("VK_TAB", { shiftKey: true }, view.styleWindow);
  is(
    inplaceEditor(view.styleDocument.activeElement),
    inplaceEditor(h1RuleEditor.newPropSpan),
    "Hitting Shift+Tab triggered the editor for the new property"
  );

  // Blur the input to not interfere with the rest of the test
  const onBlur = once(view.styleDocument.activeElement, "blur");
  view.styleDocument.activeElement.blur();
  await onBlur;

  info(
    "Check that clicking the Show unused variable button does show the unused variables"
  );
  showUnusedVariablesButton.click();

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
      declarations: h1Declarations,
    },
    {
      selector: ":where(h1)",
      declarations: whereH1Declarations,
    },
  ]);

  info(
    "Selecting another node and select h1 back to assert the rules after a refresh"
  );
  await selectNode("body", inspector);
  await selectNode("h1", inspector);

  is(
    getUnusedVariableButton(view, 1),
    null,
    "Unused variable button is kept hidden after refreshing rules view"
  );

  info("Add another unused variables to the :where(h1) rule");
  // Sanity check
  ok(
    !getUnusedVariableButton(view, 2),
    "The unused variable button isn't displayed at first for :where(h1) rule"
  );

  // We shouldn't add the property via the UI, as variables added by the user in the
  // Rules view are always visible (see browser_rules_variables_unused_add_property.js).
  // We could add the property via CSSOM, but it looks like there's a bug at the moment
  // where properties aren't showing up (unrelated to unused variable).
  // So add the property via the UI, but clear the user properties so it won't be seen
  // as added by the user.
  await addProperty(view, 2, "--added-unused-where", "new-1");
  view.store.userProperties.clear();

  info(
    "Selecting another node and select h1 back after adding property via CSSOM"
  );
  await selectNode("body", inspector);
  await selectNode("h1", inspector);

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: h1Declarations,
    },
    {
      selector: ":where(h1)",
      // we only see the height variable, --unused-c is now hidden, as well as all the
      // --unused-cssom-* variables
      declarations: [{ name: "height", value: "var(--h)" }],
    },
  ]);

  is(
    getUnusedVariableButton(view, 2).textContent,
    "Show 10 unused custom CSS properties",
    "Unused variable button is kept hidden after refreshing rules view"
  );
});
