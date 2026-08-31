/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for as-authored styles.

add_task(async function () {
  const html = `
    <style type="text/css">
      #testid {
        /* Invalid property */
        something: random;
        /* Invalid value */
        color: orang;
        /* Override */
        background-color: blue;
        background-color: #f06;
      }
      </style>
      <div id="testid" class="testclass">Styled Node</div>`;
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(html));

  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  const elementStyle = view.elementStyle;

  const expected = [
    {
      name: "something",
      overridden: false,
      isNameValid: false,
      isValid: false,
    },
    { name: "color", overridden: false, isNameValid: true, isValid: false },
    {
      name: "background-color",
      overridden: true,
      isNameValid: true,
      isValid: true,
    },
    {
      name: "background-color",
      overridden: false,
      isNameValid: true,
      isValid: true,
    },
  ];

  const rule = elementStyle.rules[1];

  for (let i = 0; i < expected.length; ++i) {
    const prop = rule.textProps[i];
    is(prop.name, expected[i].name, "Check name for prop " + i);
    is(
      prop.overridden,
      expected[i].overridden,
      "Check overridden for prop " + i
    );
    is(
      prop.isNameValid(),
      expected[i].isNameValid,
      "Check if property name is valid for prop " + i
    );
    is(
      prop.isValid(),
      expected[i].isValid,
      "Check if whole declaration is valid for prop " + i
    );
  }
});
