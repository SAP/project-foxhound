/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test the rule-view content when the inspector gets opened via the page
// ctx-menu "inspect element"

const CONTENT = `
  <body style="color:red;">
    <div style="color:blue;">
      <p style="color:green;">
        <span style="color:yellow;">test element</span>
      </p>
    </div>
  </body>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + CONTENT);

  // const commands = await CommandsFactory.forTab(tab);
  // // Initialize the TargetCommands which require some async stuff to be done
  // // before being fully ready. This will define the `targetCommand.targetFront` attribute.
  // await commands.targetCommand.startListening();
  const inspector = await clickOnInspectMenuItem("span");

  const { view } = inspector.getPanel("ruleview");
  checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [
        {
          name: "color",
          value: "yellow",
        },
      ],
    },
    {
      header: STYLE_INSPECTOR_L10N.getFormatStr("rule.inheritedFrom", "p"),
    },
    {
      selector: "element",
      selectorEditable: false,
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "green",
          overridden: true,
        },
      ],
    },
    {
      header: STYLE_INSPECTOR_L10N.getFormatStr("rule.inheritedFrom", "div"),
    },
    {
      selector: "element",
      selectorEditable: false,
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "blue",
          overridden: true,
        },
      ],
    },
    {
      header: STYLE_INSPECTOR_L10N.getFormatStr("rule.inheritedFrom", "body"),
    },
    {
      selector: "element",
      selectorEditable: false,
      inherited: true,
      declarations: [
        {
          name: "color",
          value: "red",
          overridden: true,
        },
      ],
    },
  ]);
});
