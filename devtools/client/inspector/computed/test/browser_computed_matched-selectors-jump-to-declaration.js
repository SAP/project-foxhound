/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests for the order of matched selector in the computed view.
const TEST_URI = `data:text/html,<meta charset=utf8>
  <style>
    body {
      color: blue !important;
      colum-gap: 0px;
      gap: 10px 20px;
      background-color: rgb(0, 1, 2);
    }

    :where(body) {
      color: gold;
      color: tomato !important;
      color: hotpink;
      gap: 30px;
      column-gap: 40px;
    }

    :where(body:not(.secondary)) {
      column-gap: 50px;
      gap: 0 60px;
    }

    html {
      color: lime !important;
      color: cyan !important;
    }

    :where(html) {
      color: white;
      color: black;
    }

    body::after {
      content: " world";
      color: purple;
    }
  </style>
  <body>Hello`;

add_task(async function testJumpToDeclaration() {
  // enable prefers-reduced-motion so the scroll happens instantly
  await pushPref("ui.prefersReducedMotion", 1);
  await pushPref("devtools.inspector.three-pane-enabled", true);
  await addTab(TEST_URI);
  const { inspector, view } = await openComputedView();
  const ruleView = await inspector.getPanel("ruleview").view;

  const bodyNodeFront = await getNodeFront("body", inspector.markup);
  await selectNode(bodyNodeFront, inspector);

  info("Check jump to declaration from the color property matched selectors");
  // the rules view is refreshed because we're getting notified of a new stylesheet resource
  // (a UA stylesheet) when fetching the matched selectors.
  const onRulesViewRefresh = inspector.once("rule-view-refreshed");
  const bodyColorMatchedSelectorEls = await checkMatchedSelectorForProperty(
    view,
    {
      property: "color",
      expectedComputedValue: "rgb(0, 0, 255)",
      expectedMatchedSelectors: [
        {
          selector: "body",
          value: "blue",
        },
        {
          selector: ":where(body)",
          value: "tomato",
        },
        {
          selector: "html",
          value: "cyan",
          match: false,
        },
        {
          selector: ":where(html)",
          value: "black",
          match: false,
        },
        {
          selector: ":root",
          value: "canvastext",
          match: false,
        },
      ],
    }
  );
  await onRulesViewRefresh;

  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColorMatchedSelectorEls[0],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "blue !important",
  });

  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColorMatchedSelectorEls[1],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "tomato !important",
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColorMatchedSelectorEls[2],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "cyan !important",
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColorMatchedSelectorEls[3],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "black",
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColorMatchedSelectorEls[4],
    shouldHaveJumpButton: false,
  });

  info(
    "Check jump to declaration from the column-gap property (set via a shorthand) matched selectors"
  );
  const bodyColumnGapMatchedSelectorEls = await checkMatchedSelectorForProperty(
    view,
    {
      property: "column-gap",
      expectedComputedValue: "20px",
      expectedMatchedSelectors: [
        {
          selector: "body",
          value: "20px",
        },
        {
          selector: ":where(body:not(.secondary))",
          value: "60px",
        },
        {
          selector: ":where(body)",
          value: "40px",
        },
      ],
    }
  );

  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColumnGapMatchedSelectorEls[0],
    expectedHighlightedRuleViewPropertyName: "column-gap",
    expectedHighlightedRuleViewPropertyValue: "20px",
    inComputed: true,
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColumnGapMatchedSelectorEls[1],
    expectedHighlightedRuleViewPropertyName: "column-gap",
    expectedHighlightedRuleViewPropertyValue: "60px",
    inComputed: true,
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyColumnGapMatchedSelectorEls[2],
    expectedHighlightedRuleViewPropertyName: "column-gap",
    expectedHighlightedRuleViewPropertyValue: "40px",
    inComputed: false,
  });

  info(
    "Check jump to declaration from the color property matched selectors when pseudo element node is selected"
  );
  const bodyChildrenNodeFronts =
    await inspector.markup.walker.children(bodyNodeFront);
  const bodyAfterElement = bodyChildrenNodeFronts.nodes.at(-1);
  is(bodyAfterElement.displayName, "::after", "Got expected ::after nodeFront");
  await selectNode(bodyAfterElement, inspector);

  const bodyAfterPseudoColorMatchedSelectorEls =
    await checkMatchedSelectorForProperty(view, {
      property: "color",
      expectedComputedValue: "rgb(128, 0, 128)",
      expectedMatchedSelectors: [
        {
          selector: "body::after",
          value: "purple",
        },
        {
          selector: "body",
          value: "blue",
          match: false,
        },
        {
          selector: ":where(body)",
          value: "tomato",
          match: false,
        },
        {
          selector: "html",
          value: "cyan",
          match: false,
        },
        {
          selector: ":where(html)",
          value: "black",
          match: false,
        },
        {
          selector: ":root",
          value: "canvastext",
          match: false,
        },
      ],
    });

  // only check a jumping to the pseudo element rule and a rule on the binding element,
  // since we already checked the other cases in the first part of the test
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyAfterPseudoColorMatchedSelectorEls[0],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "purple",
  });
  await checkJumpToDeclaration({
    ruleView,
    selectorEl: bodyAfterPseudoColorMatchedSelectorEls[1],
    expectedHighlightedRuleViewPropertyName: "color",
    expectedHighlightedRuleViewPropertyValue: "blue !important",
  });
});

add_task(async function testJumpToDeclarationThreePaneDisabled() {
  // Disable three-pane to make sure the rule view gets selected when jumping to declaration
  await pushPref("devtools.inspector.three-pane-enabled", false);
  await addTab(TEST_URI);
  // First open rule view so we can listen for events on it
  const { inspector, view: ruleView } = await openRuleView();
  const { view } = await openComputedView();
  await selectNode("body", inspector);

  info("Check jump to declaration from the color property matched selectors");
  const matchedSelectorEls = await checkMatchedSelectorForProperty(view, {
    property: "background-color",
    expectedComputedValue: "rgb(0, 1, 2)",
    expectedMatchedSelectors: [
      {
        selector: "body",
        value: "rgb(0, 1, 2)",
      },
    ],
  });

  await checkJumpToDeclaration({
    ruleView,
    selectorEl: matchedSelectorEls[0],
    expectedHighlightedRuleViewPropertyName: "background-color",
    expectedHighlightedRuleViewPropertyValue: "rgb(0, 1, 2)",
  });
});

async function checkJumpToDeclaration({
  ruleView,
  selectorEl,
  expectedHighlightedRuleViewPropertyName,
  expectedHighlightedRuleViewPropertyValue,
  shouldHaveJumpButton = true,
  inComputed = false,
}) {
  const actualSelectorText =
    selectorEl.querySelector(".fix-get-selection").innerText;
  const actualValue = selectorEl.querySelector(
    ".computed-other-property-value"
  ).innerText;

  const jumpButton = selectorEl.querySelector("button.jump-definition");
  if (!shouldHaveJumpButton) {
    is(
      jumpButton,
      null,
      `There isn't a jump to definition button for "${actualSelectorText}" > "${actualValue}"`
    );
    return;
  }

  ok(
    !!jumpButton,
    `There is a jump to definition button for "${actualSelectorText}" > "${actualValue}"`
  );
  is(
    jumpButton.title,
    "Jump to declaration",
    "Jump button has expected title attribute"
  );

  const onHighlightProperty = ruleView.once("element-highlighted");
  jumpButton.click();
  info("wait for element-highlighted");
  const highlightedElement = await onHighlightProperty;
  const propertyNameEl = highlightedElement.querySelector(
    ".ruleview-propertyname"
  );
  const propertyValueEl = highlightedElement.querySelector(
    ".ruleview-propertyvalue"
  );
  is(
    propertyNameEl.innerText,
    expectedHighlightedRuleViewPropertyName,
    `The expected element was highlighted when jumping from button for "${actualSelectorText}" > "${actualValue}"`
  );
  is(
    propertyValueEl.innerText,
    expectedHighlightedRuleViewPropertyValue,
    `The expected element was highlighted when jumping from button for "${actualSelectorText}" > "${actualValue}"`
  );

  const computedList = highlightedElement.closest(".ruleview-computedlist");
  is(
    !!computedList,
    inComputed,
    `The highlighted element for "${actualSelectorText}" > "${actualValue}" is ${inComputed ? "" : "not "}in an expanded shorthand`
  );

  // check that the declaration we jumped to is into view
  ok(
    isInViewport(highlightedElement, highlightedElement.ownerGlobal),
    `Highlighted element is in view`
  );
  const activeElement = highlightedElement.ownerDocument.activeElement;
  const expectedFocusedElement = inComputed
    ? highlightedElement
        .closest(".ruleview-property")
        .querySelector(".ruleview-propertycontainer .ruleview-propertyvalue")
    : propertyValueEl;
  is(
    activeElement,
    expectedFocusedElement,
    "Focus is set on the declaration value element"
  );
}

function isInViewport(element, win) {
  const { top, left, bottom, right } = element.getBoundingClientRect();
  return (
    top >= 0 &&
    bottom <= win.innerHeight &&
    left >= 0 &&
    right <= win.innerWidth
  );
}
