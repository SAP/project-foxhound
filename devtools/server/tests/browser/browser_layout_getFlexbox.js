/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function basic_flexbox() {
  const { target, walker, layout } = await initLayoutFrontForUrl(
    `data:text/html;charset=utf-8,<!doctype html><style>.flex {display: flex;width: 500px;}.flex > div {flex: 1;}</style><div class="flex"><div>A</div><div>B</div></div>`
  );

  ok(layout, "The LayoutFront was created");
  ok(layout.getCurrentFlexbox, "The getCurrentFlexbox method exists");

  let didThrow = false;
  try {
    await layout.getCurrentFlexbox(null);
  } catch (e) {
    didThrow = true;
  }
  ok(
    didThrow,
    "An exception was thrown for a missing NodeActor in getCurrentFlexbox"
  );

  const invalidNode = await walker.querySelector(walker.rootNode, "style");
  const invalidNodeFlexBoxFront = await layout.getCurrentFlexbox(invalidNode);
  is(
    invalidNodeFlexBoxFront,
    null,
    "For an invalid flexbox item null was returned"
  );

  const flexItem = await walker.querySelector(walker.rootNode, "div.flex");
  const flexboxFront = await layout.getCurrentFlexbox(flexItem);

  const flexItems = await flexboxFront.getFlexItems(flexboxFront);
  ok(Array.isArray(flexItems), "An array of flexbox items was returned.");
  is(flexItems.length, 2, "2 flexbox items where returned");

  is(flexItems[0].properties["flex-basis"], "0%");

  await target.destroy();
  gBrowser.removeCurrentTab();
});

add_task(async function flexbox_item_flex_basis() {
  const cases = [
    { style: "flex: 1;", expected: "0%" },
    { style: "flex: 1 1 1px;", expected: "1px" },
    { style: "flex: 1;width: 100%;", expected: "0%" },
    { style: "flex: 1 1 1px;width: 100%;", expected: "1px" },
    {
      style: "--basis: 1px; flex: 1 1 var(--basis, 100); width: 100%;",
      expected: "var(--basis, 100)",
    },
  ];

  for (const { style, expected } of cases) {
    const { target, walker, layout } = await initLayoutFrontForUrl(
      `data:text/html;charset=utf-8,<!doctype html><style>.flex {display: flex;width: 500px;}.flex > div {${style}}</style><div class="flex"><div>A</div><div>B</div></div>`
    );

    const flexItem = await walker.querySelector(walker.rootNode, "div.flex");
    const flexboxFront = await layout.getCurrentFlexbox(flexItem);
    const flexItems = await flexboxFront.getFlexItems(flexboxFront);
    is(flexItems[0].properties["flex-basis"], expected);

    await target.destroy();
    gBrowser.removeCurrentTab();
  }
});
