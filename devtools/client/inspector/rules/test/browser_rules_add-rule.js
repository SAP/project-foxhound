/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests adding a new rule using the add rule button.

const TEST_URI = `
  <style>
    .testclass {
      text-align: center;

      &::after {
        content: "-";
      }
    }
  </style>
  <div id="testid" class="testclass">Styled Node</div>
  <span class="testclass2">This is a span</span>
  <span class="class1 class2">Multiple classes</span>
  <span class="class3      class4">Multiple classes</span>
  <p>Empty<p>
  <h1 class="asd@@@@a!!!!:::@asd">Invalid characters in class</h1>
  <h2 id="asd@@@a!!2a">Invalid characters in id</h2>
  <svg viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="5" fill="blue"></circle>
  </svg>
  <footer>Footer</footer>
`;

const TEST_DATA = [
  { node: "#testid", expected: "#testid", expectedIndex: 4 },
  { node: ".testclass2", expected: ".testclass2" },
  { node: ".class1.class2", expected: ".class1.class2" },
  { node: ".class3.class4", expected: ".class3.class4" },
  { node: "p", expected: "p" },
  { node: "h1", expected: ".asd\\@\\@\\@\\@a\\!\\!\\!\\!\\:\\:\\:\\@asd" },
  { node: "h2", expected: "#asd\\@\\@\\@a\\!\\!2a" },
  { node: "circle", expected: "circle" },
];

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  for (const data of TEST_DATA) {
    const { node, expected, expectedIndex = 1 } = data;
    await selectNode(node, inspector);
    await addNewRuleAndDismissEditor(inspector, view, expected, expectedIndex);
  }

  info("Check that we can add rule for pseudo element node");
  const testidNodeFront = await getNodeFront("#testid", inspector);
  const testidNodeFrontChildren =
    await inspector.walker.children(testidNodeFront);
  const afterNodeFront = testidNodeFrontChildren.nodes.at(-1);
  await selectNode(afterNodeFront, inspector);
  // sanity check
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "We selected the ::after pseudo element"
  );
  await addNewRuleAndDismissEditor(inspector, view, "#testid::after", 0);

  info(`Check that clicking the "Add Rule" button clears the filter`);
  await selectNode("footer", inspector);
  is(
    view.element.children.length,
    1,
    "footer only has 1 rule before clicking on the button."
  );
  await setSearchFilter(view, "thereisnomatch");
  const onRuleViewFiltered = view.inspector.once("ruleview-filtered");
  await addNewRuleAndDismissEditor(inspector, view, "footer", 1);
  await onRuleViewFiltered;
  is(view.searchField.value, "", "Search filter was cleared.");
  is(view.element.children.length, 2, "A new rule was added");
});
