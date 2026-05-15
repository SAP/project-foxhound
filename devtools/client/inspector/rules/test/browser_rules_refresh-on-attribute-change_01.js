/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that changing the current element's attributes refreshes the rule-view

const TEST_URI = `
  <style type="text/css">
    #testid {
      background-color: blue;
    }
    .testclass {
      background-color: green;
    }
  </style>
  <div id="testid" class="testclass" style="margin-top: 1px; padding-top: 5px;">
    Styled Node
  </div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  info(
    "Checking that the rule-view has the element, #testid and .testclass selectors"
  );
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [
        { name: "margin-top", value: "1px" },
        { name: "padding-top", value: "5px" },
      ],
    },
    {
      selector: "#testid",
      declarations: [{ name: "background-color", value: "blue" }],
    },
    {
      selector: ".testclass",
      declarations: [
        { name: "background-color", value: "green", overridden: true },
      ],
    },
  ]);

  info(
    "Changing the node's ID attribute and waiting for the " +
      "rule-view refresh"
  );
  let ruleViewRefreshed = inspector.once("rule-view-refreshed");
  await setContentPageElementAttribute("#testid", "id", "differentid");
  await ruleViewRefreshed;

  info("Checking that the rule-view doesn't have the #testid selector anymore");
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [
        { name: "margin-top", value: "1px" },
        { name: "padding-top", value: "5px" },
      ],
    },
    {
      selector: ".testclass",
      declarations: [{ name: "background-color", value: "green" }],
    },
  ]);

  info("Reverting the ID attribute change");
  ruleViewRefreshed = inspector.once("rule-view-refreshed");
  await setContentPageElementAttribute("#differentid", "id", "testid");
  await ruleViewRefreshed;

  info("Checking that the rule-view has all the selectors again");
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [
        { name: "margin-top", value: "1px" },
        { name: "padding-top", value: "5px" },
      ],
    },
    {
      selector: "#testid",
      declarations: [{ name: "background-color", value: "blue" }],
    },
    {
      selector: ".testclass",
      declarations: [
        { name: "background-color", value: "green", overridden: true },
      ],
    },
  ]);
});
