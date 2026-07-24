/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for attr() in rule view.

const TEST_URI = `data:text/html,<meta charset=utf8>
  <style>
    div::before {
      content: attr(data-before);
    }

    div::after {
      content: attr(data-after, "✕");
      display: list-item;
    }

    div::after::marker {
      content: attr(data-marker, "-");
    }
  </style>
  <div id=with-attr data-before="→" data-after="←" data-marker="❥"></div>
  <div id=without-attr></div>`;

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  const withAttrNodeFront = await getNodeFront("#with-attr", inspector);
  await selectNode(withAttrNodeFront, inspector);

  info("Expand pseudo elements section");
  const pseudoElementToggle = view.styleDocument.querySelector(
    `[aria-controls="pseudo-elements-container"]`
  );
  // sanity check
  is(
    pseudoElementToggle.ariaExpanded,
    "false",
    "pseudo element section is collapsed at first"
  );
  pseudoElementToggle.click();
  is(
    pseudoElementToggle.ariaExpanded,
    "true",
    "pseudo element section is now expanded"
  );

  info(
    "Check that the declarations using `attr()` are properly rendered and that the preview tooltip works as expected"
  );
  await assertAttr({
    view,
    description: `matched "data-before" on #with-attr node`,
    propertyName: "content",
    selector: "div::before",
    expected: {
      text: `attr(data-before)`,
      attributeName: "data-before",
      attributeUnmatched: false,
      tooltipText: `"→"`,
      fallback: null,
    },
  });

  await assertAttr({
    view,
    description: `unmatched "data-after" fallback on #with-attr node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: false,
      tooltipText: `"←"`,
      fallback: `"✕"`,
    },
  });

  // Select #with-attr::after element
  const withAttrChildren =
    await inspector.markup.walker.children(withAttrNodeFront);
  const withAttrAfterNode = withAttrChildren.nodes.at(-1);
  await selectNode(withAttrAfterNode, inspector);

  await assertAttr({
    view,
    description: `unmatched "data-after" fallback on #with-attr::after node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: false,
      tooltipText: `"←"`,
      fallback: `"✕"`,
    },
  });

  // Select ::after::marker element
  const withAttrAfterChildren =
    await inspector.markup.walker.children(withAttrAfterNode);
  const withAttrAfterMarkerNode = withAttrAfterChildren.nodes[0];
  await selectNode(withAttrAfterMarkerNode, inspector);
  // Note that in the page, the fallback is being used, but shouldn't (see Bug 2012042),
  // so we're showing the right thing here
  await assertAttr({
    view,
    description: `unmatched "data-marker" fallback on #with-attr::after::marker node`,
    propertyName: "content",
    selector: "div::after::marker",
    expected: {
      text: `attr(data-marker, "-")`,
      attributeName: "data-marker",
      attributeUnmatched: false,
      tooltipText: `"❥"`,
      fallback: `"-"`,
    },
  });

  const withoutAttrNodeFront = await getNodeFront("#without-attr", inspector);
  await selectNode(withoutAttrNodeFront, inspector);
  await assertAttr({
    view,
    description: `unmatched "data-before" on #without-attr node`,
    propertyName: "content",
    selector: "div::before",
    expected: {
      text: `attr(data-before)`,
      attributeName: "data-before",
      attributeUnmatched: true,
      tooltipText: `Attribute data-before is not set`,
      fallback: null,
    },
  });
  await assertAttr({
    view,
    description: `unmatched "data-after" on #without-attr node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: true,
      tooltipText: `Attribute data-after is not set`,
      fallback: `"✕"`,
    },
  });

  // Select #with-attr::after element
  const withoutAttrChildren =
    await inspector.markup.walker.children(withoutAttrNodeFront);
  const withoutAttrAfterNode = withoutAttrChildren.nodes.at(-1);
  await selectNode(withoutAttrAfterNode, inspector);
  await assertAttr({
    view,
    description: `unmatched "data-after" on #without-attr::after node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: true,
      tooltipText: `Attribute data-after is not set`,
      fallback: `"✕"`,
    },
  });

  // Select ::after::marker element
  const withoutAttrAfterChildren =
    await inspector.markup.walker.children(withoutAttrAfterNode);
  const withoutAttrAfterMarkerNode = withoutAttrAfterChildren.nodes[0];
  await selectNode(withoutAttrAfterMarkerNode, inspector);
  await assertAttr({
    view,
    description: `unmatched "data-marker" on #without-attr::after::marker node`,
    propertyName: "content",
    selector: "div::after::marker",
    expected: {
      text: `attr(data-marker, "-")`,
      attributeName: "data-marker",
      attributeUnmatched: true,
      tooltipText: `Attribute data-marker is not set`,
      fallback: `"-"`,
    },
  });

  info("Check that updating an attribute does update the rendering");
  // Select the #without-attr
  await selectNode(withoutAttrNodeFront, inspector);

  info("Add the missing attribute");
  let onRuleViewRefreshed = inspector.once("rule-view-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document
      .querySelector("#without-attr")
      .setAttribute("data-after", "new-after");
  });
  await onRuleViewRefreshed;
  await assertAttr({
    view,
    description: `newly matched "data-after" on #without-attr::after node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: false,
      tooltipText: `"new-after"`,
      fallback: `"✕"`,
    },
  });

  info("Update the attribute");
  onRuleViewRefreshed = inspector.once("rule-view-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document
      .querySelector("#without-attr")
      .setAttribute("data-after", "updated-after");
  });
  await onRuleViewRefreshed;
  await assertAttr({
    view,
    description: `updated matched "data-after" on #without-attr::after node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: false,
      tooltipText: `"updated-after"`,
      fallback: `"✕"`,
    },
  });

  info("Remove the attribute");
  onRuleViewRefreshed = inspector.once("rule-view-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document
      .querySelector("#without-attr")
      .removeAttribute("data-after");
  });
  await onRuleViewRefreshed;
  await assertAttr({
    view,
    description: `updated matched "data-after" on #without-attr::after node`,
    propertyName: "content",
    selector: "div::after",
    expected: {
      text: `attr(data-after, "✕")`,
      attributeName: "data-after",
      attributeUnmatched: true,
      tooltipText: `Attribute data-after is not set`,
      fallback: `"✕"`,
    },
  });
});

async function assertAttr({
  view,
  propertyName,
  selector,
  description,
  expected,
}) {
  info(description);
  const { valueSpan } = getRuleViewProperty(view, selector, propertyName);
  is(
    valueSpan.textContent,
    expected.text,
    `Got expected text for the property value`
  );
  const attributeEl = valueSpan.querySelector(".inspector-attribute");
  const fallbackEl = valueSpan.querySelector(".inspector-attr-fallback");
  if (!attributeEl) {
    ok(
      false,
      `Could not find an .inspector-attribute element on passed ruleViewPropertyValueSpan`
    );
    return;
  }

  is(
    attributeEl.textContent,
    expected.attributeName,
    "attribute element is the expected one"
  );
  is(
    attributeEl.classList.contains("inspector-unmatched"),
    expected.attributeUnmatched,
    `attribute element ${expected.attributeUnmatched ? "has " : "doesn't have"} unmatched style`
  );

  if (!expected.fallback) {
    is(fallbackEl, null, `There is no fallback element`);
  } else {
    is(
      fallbackEl.textContent,
      expected.fallback,
      `Got expected fallback value`
    );
    is(
      fallbackEl.classList.contains("inspector-unmatched"),
      !expected.attributeUnmatched,
      `attribute fallback element ${!expected.attributeUnmatched ? "has" : "doesn't have"} unmatched style`
    );
  }

  // Ensure that the element can be targetted from EventUtils.
  attributeEl.scrollIntoView();

  const tooltip = view.tooltips.getTooltip("previewTooltip");
  const onTooltipReady = tooltip.once("shown");
  EventUtils.synthesizeMouseAtCenter(
    attributeEl,
    { type: "mousemove" },
    attributeEl.ownerDocument.defaultView
  );
  await onTooltipReady;

  is(
    tooltip.panel.textContent,
    expected.tooltipText,
    "Tooltip has expected text"
  );

  info("Hide the tooltip");
  const onHidden = tooltip.once("hidden");
  // Move the mouse elsewhere to hide the tooltip
  EventUtils.synthesizeMouse(
    attributeEl.ownerDocument.body,
    1,
    1,
    { type: "mousemove" },
    attributeEl.ownerDocument.defaultView
  );
  await onHidden;
}
