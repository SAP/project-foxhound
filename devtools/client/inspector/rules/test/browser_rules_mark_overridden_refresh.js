/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view marks overridden rules correctly in the same rule, and that
// refreshing the panel doesn't causes declarations to be disabled (See Bug 1984095).

const TEST_URI = `
  <style>
    body {
      color: blue;
      color: red !important;
      color: purple;
    }
  </style>
  <body>overriden declarations after refresh</body>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("body", inspector);

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `body`,
      declarations: [
        { name: "color", value: "blue", overridden: true },
        { name: "color", value: "red !important" },
        { name: "color", value: "purple", overridden: true },
      ],
    },
  ]);

  info("Simulate light mode to trigger a refresh");
  const onRuleViewRefreshed = inspector.once("rule-view-refreshed");
  inspector.panelDoc
    .querySelector("#color-scheme-simulation-light-toggle")
    .click();
  await onRuleViewRefreshed;

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `body`,
      declarations: [
        { name: "color", value: "blue", overridden: true },
        { name: "color", value: "red !important" },
        { name: "color", value: "purple", overridden: true },
      ],
    },
  ]);
});
