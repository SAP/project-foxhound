/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test matched selectors and variables defined for a :host selector.

const SHADOW_DOM = `<style>
  :host {
    --test-color: red;
  }

  span {
    color: var(--test-color);
  }
</style>
<span class="test-span">test</span>
<div class="nested-shadow-host"></div>`;

const TEST_PAGE = `
  <div id="host"></div>
  <script>
    const div = document.querySelector("div");
    const shadow = div.attachShadow({ mode: "open" });
    shadow.innerHTML = \`${SHADOW_DOM}\`;

    const sharedStyleSheet  = new CSSStyleSheet();
    sharedStyleSheet.replaceSync(\`
      :where(.test-span), [test-rule-shared] {
        background-color: var(--test-background-color-shared);
      }
      :where(:host), [test-rule-shared] {
        --test-background-color-shared: gold;
      }\`);

    shadow.adoptedStyleSheets = [sharedStyleSheet];

    const nestedShadow = shadow.querySelector(".nested-shadow-host").attachShadow({
      mode: "open"
    });
    nestedShadow.innerHTML = \`${SHADOW_DOM}\`;
    nestedShadow.adoptedStyleSheets = [sharedStyleSheet];
  </script>`;

const TEST_URI = `https://example.com/document-builder.sjs?html=${encodeURIComponent(
  TEST_PAGE
)}`;

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  info("Select the host and check that :host is matching");
  {
    await selectNode("#host", inspector);
    let selector = getRuleViewRuleEditor(view, 1).selectorText;
    is(selector.textContent, ":host", "Got expected rule selector");
    is(
      selector.querySelector(".matched").textContent,
      ":host",
      ":host should be matched."
    );

    selector = getRuleViewRuleEditor(view, 2).selectorText;
    is(
      selector.textContent,
      ":where(:host), [test-rule-shared]",
      "Got expected rule selector"
    );
    is(
      selector.querySelector(".matched").textContent,
      ":where(:host)",
      ":where(:host) should be matched."
    );
    is(
      selector.querySelector(".unmatched").textContent,
      "[test-rule-shared]",
      "[test-rule-shared] should not be matched."
    );
  }

  info("Select a shadow dom element and check that :host is matching");
  {
    const nodeFront = await getNodeFrontInShadowDom(
      ".test-span",
      "#host",
      inspector
    );
    await selectNode(nodeFront, inspector);

    let selector = getRuleViewRuleEditor(view, 4).selectorText;
    is(selector.textContent, ":host", "Got expected rule selector");
    is(
      selector.querySelector(".matched").textContent,
      ":host",
      ":host should be matched."
    );

    selector = getRuleViewRuleEditor(view, 5).selectorText;
    is(
      selector.textContent,
      ":where(:host), [test-rule-shared]",
      "Got expected rule selector"
    );
    is(
      selector.querySelector(".matched").textContent,
      ":where(:host)",
      ":where(:host) should be matched."
    );
    is(
      selector.querySelector(".unmatched").textContent,
      "[test-rule-shared]",
      "[test-rule-shared] should not be matched."
    );

    info("Check that the variable from :host is correctly applied");
    const setColor = getRuleViewProperty(
      view,
      "span",
      "color"
    ).valueSpan.querySelector(".inspector-variable");
    is(setColor.textContent, "--test-color", "--test-color is set correctly");
    is(
      setColor.dataset.variable,
      "red",
      "--test-color's dataset.variable is set correctly"
    );
    let previewTooltip = await assertShowPreviewTooltip(view, setColor);
    ok(
      previewTooltip.panel.textContent.includes("red"),
      "CSS variable preview tooltip shows the expected CSS variable"
    );
    await assertTooltipHiddenOnMouseOut(previewTooltip, setColor);

    const setBackgroundColor = getRuleViewProperty(
      view,
      ":where(.test-span), [test-rule-shared]",
      "background-color"
    ).valueSpan.querySelector(".inspector-variable");
    is(
      setBackgroundColor.textContent,
      "--test-background-color-shared",
      "--test-background-color-shared is set correctly"
    );
    is(
      setBackgroundColor.dataset.variable,
      "gold",
      "--test-background-color-shared's dataset.variable is set correctly"
    );
    previewTooltip = await assertShowPreviewTooltip(view, setBackgroundColor);
    ok(
      previewTooltip.panel.textContent.includes("gold"),
      "CSS variable preview tooltip shows the expected CSS variable"
    );
    await assertTooltipHiddenOnMouseOut(previewTooltip, setBackgroundColor);
  }

  info("Select the nested host and check that :host is matching");
  {
    const nestedShadowHostNodeFront = await getNodeFrontInShadowDom(
      ".nested-shadow-host",
      "#host",
      inspector
    );
    await selectNode(nestedShadowHostNodeFront, inspector);
    let selector = getRuleViewRuleEditor(view, 1).selectorText;
    is(selector.textContent, ":host", "Got expected rule selector");
    is(
      selector.querySelector(".matched").textContent,
      ":host",
      ":host should be matched for the nested host."
    );

    selector = getRuleViewRuleEditor(view, 2).selectorText;
    is(
      selector.textContent,
      ":where(:host), [test-rule-shared]",
      "Got expected rule selector"
    );
    is(
      selector.querySelector(".matched")?.textContent,
      ":where(:host)",
      ":where(:host) should be matched for the nested host."
    );
    is(
      selector.querySelector(".unmatched").textContent,
      "[test-rule-shared]",
      "[test-rule-shared] should not be matched."
    );
  }

  info("Select a nested shadow dom element and check that :host is matching");
  {
    const topLevelShadowRootNodeFront = await getShadowRoot("#host", inspector);
    const nestedHostNodeFront = await inspector.walker.querySelector(
      topLevelShadowRootNodeFront,
      ".nested-shadow-host"
    );
    const nodeFront = await getNodeFrontInShadowDom(
      ".test-span",
      nestedHostNodeFront,
      inspector
    );
    await selectNode(nodeFront, inspector);

    let selector = getRuleViewRuleEditor(view, 4).selectorText;
    is(selector.textContent, ":host", "Got expected rule selector");
    is(
      selector.querySelector(".matched").textContent,
      ":host",
      ":host should be matched for the nested shadow dom element."
    );

    selector = getRuleViewRuleEditor(view, 5).selectorText;
    is(
      selector.textContent,
      ":where(:host), [test-rule-shared]",
      "Got expected rule selector"
    );
    is(
      selector.querySelector(".matched")?.textContent,
      ":where(:host)",
      ":where(:host) should be matched for the nested shadow dom element."
    );
    is(
      selector.querySelector(".unmatched").textContent,
      "[test-rule-shared]",
      "[test-rule-shared] should not be matched."
    );

    info(
      "Check that the variable from :host is correctly applied for the nested shadow dom element"
    );
    const setColor = getRuleViewProperty(
      view,
      "span",
      "color"
    ).valueSpan.querySelector(".inspector-variable");
    is(
      setColor.textContent,
      "--test-color",
      "--test-color is set correctly for the nested shadow dom element"
    );
    is(
      setColor.dataset.variable,
      "red",
      "--test-color's dataset.variable is set correctly for the nested shadow dom element"
    );
    let previewTooltip = await assertShowPreviewTooltip(view, setColor);
    ok(
      previewTooltip.panel.textContent.includes("red"),
      "CSS variable preview tooltip shows the expected CSS variable for the nested shadow dom element"
    );
    await assertTooltipHiddenOnMouseOut(previewTooltip, setColor);

    const setBackgroundColor = getRuleViewProperty(
      view,
      ":where(.test-span), [test-rule-shared]",
      "background-color"
    ).valueSpan.querySelector(".inspector-variable");
    is(
      setBackgroundColor.textContent,
      "--test-background-color-shared",
      "--test-background-color-shared is set correctly for the nested shadow dom element"
    );
    is(
      setBackgroundColor.dataset.variable,
      "gold",
      "--test-background-color-shared's dataset.variable is set correctly for the nested shadow dom element"
    );
    previewTooltip = await assertShowPreviewTooltip(view, setBackgroundColor);
    ok(
      previewTooltip.panel.textContent.includes("gold"),
      "CSS variable preview tooltip shows the expected CSS variable for the nested shadow dom element"
    );
    await assertTooltipHiddenOnMouseOut(previewTooltip, setBackgroundColor);
  }
});
