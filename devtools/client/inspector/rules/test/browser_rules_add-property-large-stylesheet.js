/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test adding a property to a large stylesheet (whose text would be sent in a longstring
// actor, see Bug 1994758).

const TEST_URI = `
  <style>
    ${Array.from({ length: 10000 }, (_, i) => `/* ${i} */`).join("\n")}
    /* it's important to have this empty rule with a line break to trigger the issue we hit in Bug 1994758 */
    #testid {
    }
  </style>
  <div id="testid">Styled Node</div>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);

  await addProperty(view, 1, "color", "blue");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "#testid",
      declarations: [{ name: "color", value: "blue", dirty: true }],
    },
  ]);

  is(
    await getComputedStyleProperty("#testid", null, "color"),
    `rgb(0, 0, 255)`,
    "color: blue was properly applied on the element"
  );
});
