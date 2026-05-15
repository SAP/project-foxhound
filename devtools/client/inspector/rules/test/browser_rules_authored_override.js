/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for as-authored styles.

add_task(async function () {
  const gradientText1 = "(orange, blue)";
  const gradientText2 = "(pink, teal)";
  const html = `
    <style type="text/css">
      #testid {
        background-image: linear-gradient${gradientText1};
        background-image: -ms-linear-gradient${gradientText2};
        background-image: linear-gradient${gradientText2};
      }
    </style>
    <div id="testid" class="testclass">Styled Node</div>`;
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(html));

  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `#testid`,
      declarations: [
        {
          name: "background-image",
          value: `linear-gradient${gradientText1}`,
          overridden: true,
        },
        {
          name: "background-image",
          value: `-ms-linear-gradient${gradientText2}`,
          valid: false,
        },
        { name: "background-image", value: `linear-gradient${gradientText2}` },
      ],
    },
  ]);

  info(`Disable background-image: linear-gradient${gradientText2};`);
  const rule = view.elementStyle.rules[1];
  await togglePropStatus(view, rule.textProps[2]);

  await checkRuleViewContent(view, [
    {
      selector: `element`,
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: `#testid`,
      declarations: [
        {
          name: "background-image",
          value: `linear-gradient${gradientText1}`,
        },
        {
          name: "background-image",
          value: `-ms-linear-gradient${gradientText2}`,
          valid: false,
        },
        {
          name: "background-image",
          value: `linear-gradient${gradientText2}`,
          // Now the last property shouldn't be enabled anymore
          enabled: false,
          // disabled declarations use the same class as we do for "overridden"
          overridden: true,
        },
      ],
    },
  ]);
});
