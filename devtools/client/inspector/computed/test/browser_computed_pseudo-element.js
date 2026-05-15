/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that pseudoelements are displayed correctly in the rule view.

const TEST_URI = URL_ROOT + "doc_pseudoelement.html";

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openComputedView();
  await testTopLeft(inspector, view);
});

async function testTopLeft(inspector, view) {
  const node = await getNodeFront("#topleft", inspector.markup);
  await selectNode(node, inspector);
  const float = getComputedViewPropertyValue(view, "float");
  is(float, "left", "The computed view shows the correct float");

  const children = await inspector.markup.walker.children(node);
  is(children.nodes.length, 3, "Element has correct number of children");

  const beforeElement = children.nodes[0];
  await selectNode(beforeElement, inspector);

  info("check `top` property on #topleft::before");
  await checkMatchedSelectorForProperty(view, {
    property: "top",
    expectedComputedValue: "0px",
    expectedMatchedSelectors: [
      {
        selector: ".topleft::before",
        value: "0px",
      },
      {
        selector: ":where(.topleft)::before",
        value: "10px",
      },
    ],
  });

  info("check `left` property on #topleft::before");
  await checkMatchedSelectorForProperty(view, {
    property: "left",
    expectedComputedValue: "0px",
    expectedMatchedSelectors: [
      {
        selector: ".topleft::before",
        value: "0px",
      },
      {
        selector: ":where(.topleft)::before",
        value: "20px",
      },
    ],
  });

  info("check `color` property on #topleft::before");
  await checkMatchedSelectorForProperty(view, {
    property: "color",
    expectedComputedValue: "rgb(0, 255, 0)",
    expectedMatchedSelectors: [
      {
        selector: ":where(.topleft)::before",
        value: "lime",
      },
      {
        selector: ".topleft",
        value: "blue",
        match: false,
      },
      {
        selector: "body",
        value: "rgb(51, 51, 51)",
        match: false,
      },
      {
        selector: ":root",
        value: "canvastext",
        match: false,
      },
    ],
  });

  const afterElement = children.nodes.at(-1);
  await selectNode(afterElement, inspector);

  info("check `top` property on #topleft::after");
  await checkMatchedSelectorForProperty(view, {
    property: "top",
    expectedComputedValue: "96px",
    expectedMatchedSelectors: [
      {
        selector: ".box::after",
        value: "50%",
      },
    ],
  });

  info("check `left` property on #topleft::after");
  await checkMatchedSelectorForProperty(view, {
    property: "left",
    expectedComputedValue: "96px",
    expectedMatchedSelectors: [
      {
        selector: ".box::after",
        value: "50%",
      },
    ],
  });
}
