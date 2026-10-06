/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the rule-view content is correct when the page defines container queries.
const TEST_URI = `
  <!DOCTYPE html>
  <style type="text/css">
    body {
      container: mycontainer containeralias / size;
    }

    section {
      container: mycontainer / inline-size;
    }

    @container (width > 0px) {
      h1, [test-hint="nocontainername"]{
        outline-color: chartreuse;
      }
    }

    @container unknowncontainer (min-width: 2vw) {
      h1, [test-hint="unknowncontainer"] {
        border-color: salmon;
      }
    }

    @container mycontainer (1px < width < 10000px) {
      h1, [test-hint="container"] {
        color: tomato;
      }

      section, [test-hint="container-duplicate-name--body"] {
        color: gold;
      }

      div, [test-hint="container-duplicate-name--section"] {
        color: salmon;
      }
    }

    @container mycontainer {
      h2, [test-hint="query-less-container-query"] {
        color: hotpink;
      }
    }

    @container mycontainer (width > 1px), containeralias (height > 13000px), (inline-size > 42px), unknowncontainer (width > 0px) {
      h3, [test-hint="multi-condition-container-query"] {
        background-color: navy;
      }
    }

    aside {
      container-type: inline-size;
    }

    @container (width > 2px) {
      h4 {
        color: peachpuff;
      }
    }

    article {
      container-name: post;
      container-type: inline-size;
      --x: red;
      --y: 10px;
      --empty: ;
    }

    @container style(--x: red),
               style(var(--y, 1px) > 20px),
               post style(--x),
               mycontainer style(--x),
               style(--z),
               style(--empty),
               style((attr(data-x type(<length>)) < 10px) or (attr(data-y px, 10px) < 100px) or (attr(data-z px) < 1000px)) {
      h5, [test-hint="style-query"] {
        color: var(--x);
      }
    }
  </style>
  <body id=myBody class="a-container test">
    <h1>Hello @container!</h1>
    <section>
      <div>
        <h2>You rock</h2>
      </div>
      <h3>Oh oh oh</h3>
    </section>
    <aside>
      <h4>Yup</h4>
    </aside>
    <article data-x="1px" data-z>
      <h5>News</h5>
    </article>
  </body>
`;

add_task(async function () {
  await pushPref("layout.css.style-queries.enabled", true);
  // needed to check attr() in style()
  await pushPref("layout.css.attr.enabled", true);
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();

  info("Check that the query container tooltip works as expected");
  // Retrieve query containers sizes
  const { bodyInlineSize, bodyBlockSize, sectionInlineSize, asideInlineSize } =
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
      const body = content.document.body;
      const section = content.document.querySelector("section");
      const aside = content.document.querySelector("aside");
      return {
        bodyInlineSize: content.getComputedStyle(body).inlineSize,
        bodyBlockSize: content.getComputedStyle(body).blockSize,
        sectionInlineSize: content.getComputedStyle(section).inlineSize,
        asideInlineSize: content.getComputedStyle(aside).inlineSize,
      };
    });

  await selectNode("h1", inspector);
  assertContainerQueryData(view, [
    { selector: "element", ancestorRulesData: null },
    {
      selector: `h1, [test-hint="container"]`,
      ancestorRulesData: ["@container mycontainer (1px < width < 10000px) {"],
    },
    {
      selector: `h1, [test-hint="nocontainername"]`,
      ancestorRulesData: ["@container (width > 0px) {"],
    },
  ]);

  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    expectedConditionText: "mycontainer (1px < width < 10000px)",
    expectedHeaderText: "<body#myBody.a-container.test>",
    expectedBodyText: [
      "container-name: mycontainer containeralias",
      "container-type: size",
      `width: ${bodyInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "body",
  });

  info("Check that inherited rules display container query data as expected");
  await selectNode("h2", inspector);

  assertContainerQueryData(view, [
    { selector: "element", ancestorRulesData: null },
    {
      selector: `h2, [test-hint="query-less-container-query"]`,
      ancestorRulesData: ["@container mycontainer {"],
    },
    {
      selector: `div, [test-hint="container-duplicate-name--section"]`,
      ancestorRulesData: ["@container mycontainer (1px < width < 10000px) {"],
    },
    {
      selector: `section, [test-hint="container-duplicate-name--body"]`,
      ancestorRulesData: ["@container mycontainer (1px < width < 10000px) {"],
    },
  ]);

  info(
    "Check that the query container tooltip works as expected for inherited rules as well"
  );
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    expectedConditionText: "mycontainer",
    expectedHeaderText: "<section>",
    expectedBodyText: [
      "container-name: mycontainer",
      "container-type: inline-size",
    ],
    expectedSelectedNodeAfterClick: "section",
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 2,
    expectedConditionText: "mycontainer (1px < width < 10000px)",
    expectedHeaderText: "<section>",
    expectedBodyText: [
      "container-name: mycontainer",
      "container-type: inline-size",
      `width: ${sectionInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "section",
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 3,
    expectedConditionText: "mycontainer (1px < width < 10000px)",
    expectedHeaderText: "<body#myBody.a-container.test>",
    expectedBodyText: [
      "container-name: mycontainer containeralias",
      "container-type: size",
      `width: ${bodyInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "body",
  });

  info("Check that multi-conditions container query are displayed as expected");
  await selectNode("h3", inspector);

  assertContainerQueryData(view, [
    { selector: "element", ancestorRulesData: null },
    {
      selector: `h3, [test-hint="multi-condition-container-query"]`,
      ancestorRulesData: [
        "@container mycontainer (width > 1px), containeralias (height > 13000px), (inline-size > 42px), unknowncontainer (width > 0px) {",
      ],
    },
    {
      selector: `section, [test-hint="container-duplicate-name--body"]`,
      ancestorRulesData: ["@container mycontainer (1px < width < 10000px) {"],
    },
  ]);

  info(
    "Check that the query container tooltip works as expected for multi-condition queries as well"
  );
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 0,
    expectedConditionText: "mycontainer (width > 1px)",
    expectedHeaderText: "<section>",
    expectedBodyText: [
      "container-name: mycontainer",
      "container-type: inline-size",
      `width: ${sectionInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "section",
  });

  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 1,
    expectedConditionText: "containeralias (height > 13000px)",
    expectedHeaderText: "<body#myBody.a-container.test>",
    expectedBodyText: [
      "container-name: mycontainer containeralias",
      "container-type: size",
      `height: ${bodyBlockSize}`,
    ],
    expectedSelectedNodeAfterClick: "body",
    // condition is "(height > 13000px)", which is unmatched
    unmatched: true,
  });

  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 2,
    expectedConditionText: "(inline-size > 42px)",
    expectedHeaderText: "<section>",
    expectedBodyText: [
      "container-name: mycontainer",
      "container-type: inline-size",
      `inline-size: ${sectionInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "section",
  });

  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 3,
    expectedConditionText: "unknowncontainer (width > 0px)",
    unmatched: true,
    hasContainer: false,
    expectedTooltipText: `No container ‘unknowncontainer’ found`,
  });

  info(
    "Check that the query container tooltip works as expected for container without name"
  );
  await selectNode("h4", inspector);
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 0,
    expectedConditionText: "(width > 2px)",
    expectedHeaderText: "<aside>",
    expectedBodyText: [
      "container-type: inline-size",
      `width: ${asideInlineSize}`,
    ],
    expectedSelectedNodeAfterClick: "aside",
  });

  info(
    "Check that the query container tooltip works as expected for style queries"
  );
  await selectNode("h5", inspector);
  assertContainerQueryData(view, [
    { selector: "element", ancestorRulesData: null },
    {
      selector: `h5, [test-hint="style-query"]`,
      ancestorRulesData: [
        "@container style(--x: red), " +
          "style(var(--y, 1px) > 20px), " +
          "post style(--x), " +
          "mycontainer style(--x), " +
          "style(--z), " +
          "style(--empty), " +
          "style((attr(data-x type(<length>)) < 10px) or (attr(data-y px, 10px) < 100px) or (attr(data-z px) < 1000px)) {",
      ],
    },
    {
      selector: `article`,
    },
  ]);
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 0,
    expectedConditionText: "style(--x: red)",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      `--x: red`,
    ],
    expectedSelectedNodeAfterClick: "article",
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 1,
    expectedConditionText: "style(var(--y, 1px) > 20px)",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      `--y: 10px`,
    ],
    expectedSelectedNodeAfterClick: "article",
    // condition is "style(var(--y, 1px) > 20px)", but --y is set to "10px" on <article>
    unmatched: true,
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 2,
    expectedConditionText: "post style(--x)",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      `--x: red`,
    ],
    expectedSelectedNodeAfterClick: "article",
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 3,
    expectedConditionText: "mycontainer style(--x)",
    expectedHeaderText: "<body#myBody.a-container.test>",
    expectedBodyText: [
      "container-name: mycontainer containeralias",
      "container-type: size",
      `--x is not set`,
    ],
    expectedSelectedNodeAfterClick: "body",
    // condition is "mycontainer style(--x)", and --x is not defined on <body>
    unmatched: true,
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 4,
    expectedConditionText: "style(--z)",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      `--z is not set`,
    ],
    expectedSelectedNodeAfterClick: "article",
    // condition is "style(--z)", and --z is not defined on <article>
    unmatched: true,
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 5,
    expectedConditionText: "style(--empty)",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      `--empty: <empty>`,
    ],
    expectedSelectedNodeAfterClick: "article",
  });
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 6,
    expectedConditionText:
      "style((attr(data-x type(<length>)) < 10px) or (attr(data-y px, 10px) < 100px) or (attr(data-z px) < 1000px))",
    expectedHeaderText: "<article>",
    expectedBodyText: [
      "container-name: post",
      "container-type: inline-size",
      "data-x: 1px",
      "data-z: <empty>",
      // unset properties are displayed at the bottom
      "Attribute data-y is not set",
    ],
    expectedSelectedNodeAfterClick: "article",
  });
});

add_task(async function checkStyleQueryWithoutModernAttrSupport() {
  await pushPref("layout.css.style-queries.enabled", true);
  // explicitely disable modern attr() support
  await pushPref("layout.css.attr.enabled", false);
  await addTab(
    "https://example.com/document-builder.sjs?html=" +
      encodeURIComponent(TEST_URI)
  );
  const { inspector, view } = await openRuleView();

  await selectNode("h5", inspector);
  await assertQueryContainerTooltip({
    inspector,
    view,
    ruleIndex: 1,
    conditionIndex: 6,
    expectedConditionText:
      "style((attr(data-x type(<length>)) < 10px) or (attr(data-y px, 10px) < 100px) or (attr(data-z px) < 1000px))",
    expectedHeaderText: "<article>",
    // doesn't contain the attributes referenced in the query
    expectedBodyText: ["container-name: post", "container-type: inline-size"],
    expectedSelectedNodeAfterClick: "article",
    // doesn't match as attr() is not supported in style() when the pref is set to false
    unmatched: true,
  });
});

function assertContainerQueryData(view, expectedRules) {
  const rulesInView = Array.from(
    view.element.querySelectorAll(".ruleview-rule")
  );

  is(
    rulesInView.length,
    expectedRules.length,
    "All expected rules are displayed"
  );

  for (let i = 0; i < expectedRules.length; i++) {
    const expectedRule = expectedRules[i];
    info(`Checking rule #${i}: ${expectedRule.selector}`);

    const selector = rulesInView[i].querySelector(
      ".ruleview-selectors-container"
    ).innerText;
    is(selector, expectedRule.selector, `Expected selector for ${selector}`);

    const ancestorDataEl = getRuleViewAncestorRulesDataElementByIndex(view, i);

    if (expectedRule.ancestorRulesData == null) {
      is(
        ancestorDataEl,
        null,
        `No ancestor rules data displayed for ${selector}`
      );
    } else {
      is(
        ancestorDataEl?.innerText,
        expectedRule.ancestorRulesData.join("\n"),
        `Expected ancestor rules data displayed for ${selector}`
      );
    }
  }
}

async function assertQueryContainerTooltip({
  inspector,
  view,
  ruleIndex,
  conditionIndex = 0,
  expectedConditionText,
  expectedHeaderText,
  expectedBodyText,
  expectedTooltipText = null,
  expectedSelectedNodeAfterClick,
  unmatched = false,
  hasContainer = true,
}) {
  const parent = getRuleViewAncestorRulesDataElementByIndex(view, ruleIndex);
  const containerConditionEl = parent.querySelector(
    `.container-condition[data-condition-index="${conditionIndex}"]`
  );

  is(
    containerConditionEl.textContent.trim(),
    expectedConditionText,
    `Got expected #${conditionIndex} condition text for rule #${ruleIndex}`
  );

  is(
    containerConditionEl.matches(".unmatched"),
    unmatched,
    `condition "${containerConditionEl.innerText}" ${unmatched ? "has" : "does not have"} .unmatched class`
  );

  // Ensure that the element can be targetted from EventUtils.
  containerConditionEl.scrollIntoView();

  const tooltip = view.tooltips.getTooltip("interactiveTooltip");
  is(tooltip.isVisible(), false, "tooltip isn't visible at first");
  ok(
    !containerConditionEl.classList.contains("tooltip-anchor"),
    "container condition element doesn't have the tooltip-anchor class at first"
  );

  const onTooltipReady = tooltip.once("shown");

  info("synthesizing mousemove on container condition");
  // Don't use synthesizeMouseAtCenter as the condition can span multiple line and the
  // center of the boundingClientRect might not target the element.
  // Instead get the first box quad in the element so we can find a point that is guaranteed
  // to trigger the event listener.
  const { p1, p2, p3 } = containerConditionEl.getBoxQuads()[0];
  EventUtils.synthesizeMouseAtPoint(
    p1.x + (p2.x - p1.x) / 2,
    p1.y + (p3.y - p1.y) / 2,
    { type: "mousemove" },
    containerConditionEl.ownerDocument.defaultView
  );

  await onTooltipReady;
  info("tooltip was shown");

  ok(
    containerConditionEl.classList.contains("tooltip-anchor"),
    "container condition element has the tooltip-anchor class when the tooltip is displayed"
  );

  if (expectedTooltipText) {
    is(
      tooltip.panel.textContent,
      expectedTooltipText,
      "Tooltip has expected content"
    );
  } else {
    is(
      tooltip.panel.querySelector("header").textContent,
      expectedHeaderText,
      "Tooltip has expected header content"
    );

    const lis = Array.from(tooltip.panel.querySelectorAll("li")).map(
      li => li.textContent
    );
    Assert.deepEqual(lis, expectedBodyText, "Tooltip has expected body items");
  }

  const selectContainerButton = tooltip.panel.querySelector(".open-inspector");
  if (hasContainer) {
    isnot(
      selectContainerButton,
      null,
      "Tooltip header has a button to select the container"
    );

    const { waitForHighlighterTypeShown, waitForHighlighterTypeHidden } =
      getHighlighterTestHelpers(inspector);

    const onNodeHighlight = waitForHighlighterTypeShown(
      inspector.highlighters.TYPES.BOXMODEL
    );

    EventUtils.synthesizeMouseAtCenter(
      tooltip.panel.querySelector(".objectBox-node"),
      { type: "mouseover" },
      selectContainerButton.ownerDocument.defaultView
    );
    const { nodeFront: highlightedNodeFront } = await onNodeHighlight;
    is(
      highlightedNodeFront.displayName,
      expectedSelectedNodeAfterClick,
      "The correct node was highlighted"
    );

    const onceNewNodeFront = inspector.selection.once("new-node-front");
    const onNodeUnhighlight = waitForHighlighterTypeHidden(
      inspector.highlighters.TYPES.BOXMODEL
    );
    const onHidden = tooltip.once("hidden");

    const nodeToSelectBack = inspector.selection.nodeFront;

    EventUtils.synthesizeMouseAtCenter(
      selectContainerButton,
      {},
      selectContainerButton.ownerDocument.defaultView
    );

    const nodeFront = await onceNewNodeFront;
    is(
      nodeFront.displayName,
      expectedSelectedNodeAfterClick,
      "The correct node has been selected"
    );

    await onHidden;
    info("Tooltip was hidden when clicking on select container button");

    await onNodeUnhighlight;
    info("Highlighter was hidden when clicking on select container button");

    // Move mouse so it does stay in a position where it could hover something impacting
    // the test.
    EventUtils.synthesizeMouse(
      view.styleDocument.body,
      0,
      0,
      { type: "mouseover" },
      selectContainerButton.ownerDocument.defaultView
    );

    // Select the node that was previously selected
    await selectNode(nodeToSelectBack, inspector);
  } else {
    is(
      selectContainerButton,
      null,
      "Tooltip header does not have a button to select the container"
    );

    info("Hide the tooltip");
    const onHidden = tooltip.once("hidden");

    // Move the mouse elsewhere to hide the tooltip
    EventUtils.synthesizeMouse(
      containerConditionEl.ownerDocument.body,
      1,
      1,
      { type: "mousemove" },
      containerConditionEl.ownerDocument.defaultView
    );
    await onHidden;
    info("tooltip was hidden");

    ok(
      !containerConditionEl.classList.contains("tooltip-anchor"),
      "container condition element doesn't have the tooltip-anchor class after the tooltip is hidden"
    );
  }
}
