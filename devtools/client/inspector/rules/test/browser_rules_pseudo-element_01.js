/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that pseudoelements are displayed correctly in the rule view

const TEST_URI = URL_ROOT + "doc_pseudoelement.html?#:~:text=fox";
const PSEUDO_PREF = "devtools.inspector.show_pseudo_elements";

add_task(async function () {
  await pushPref(PSEUDO_PREF, true);
  await pushPref("dom.text_fragments.enabled", true);
  await pushPref("layout.css.modern-range-pseudos.enabled", true);
  await pushPref("dom.select.customizable_select.enabled", true);
  await pushPref("full-screen-api.transition-duration.enter", "0 0");
  await pushPref("full-screen-api.transition-duration.leave", "0 0");

  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  await testTopLeft(inspector, view);
  await testTopRight(inspector, view);
  await testBottomRight(inspector, view);
  await testBottomLeft(inspector, view);
  await testParagraph(inspector, view);
  await testBody(inspector, view);
  await testListAfterElement(inspector, view);
  await testListItem(inspector, view);
  await testCustomHighlight(inspector, view);
  await testSlider(inspector, view);
  await testUrlFragmentTextDirective(inspector, view);
  await testDetailsContent(inspector, view);
  await testCustomizableSelect(inspector, view);
  // keep this one last as it makes the browser go fullscreen and seem to impact other tests
  await testBackdrop(inspector, view);
});

async function testTopLeft(inspector, view) {
  const id = "#topleft";
  await assertPseudoElementRulesNumbersForSelector(id, inspector, view, {
    elementRules: 4,
    firstLineRules: 2,
    firstLetterRules: 1,
    selectionRules: 1,
    markerRules: 0,
    afterRules: 1,
    beforeRules: 2,
  });

  assertHeaders(view);

  const elementRuleView = getRuleViewRuleEditorAt(view, 7);
  is(
    elementRuleView.selectorText.textContent,
    "element",
    "About to modify the 'element' rule"
  );

  // Position for the ::first-line rule
  const index = 4;
  const elementFirstLineRule = getRuleViewRuleEditorAt(view, index).rule;

  is(
    convertTextPropsToString(elementFirstLineRule.textProps),
    "color: orange",
    "TopLeft firstLine properties are correct"
  );

  const firstProp = await addProperty(
    view,
    index,
    "background-color",
    "rgb(0, 255, 0)",
    "",
    true
  );

  await addProperty(view, index, "font-style", "italic", "", true);

  is(
    await getComputedStyleProperty(id, ":first-line", "background-color"),
    "rgb(0, 255, 0)",
    "Added property should have been used."
  );
  is(
    await getComputedStyleProperty(id, ":first-line", "font-style"),
    "italic",
    "Added property should have been used."
  );
  is(
    await getComputedStyleProperty(id, null, "text-decoration-line"),
    "none",
    "Added property should not apply to element"
  );

  await togglePropStatus(view, firstProp);

  is(
    await getComputedStyleProperty(id, ":first-line", "background-color"),
    "rgb(255, 0, 0)",
    "Disabled property should now have been used."
  );
  is(
    await getComputedStyleProperty(id, null, "background-color"),
    "rgb(221, 221, 221)",
    "Added property should not apply to element"
  );

  await togglePropStatus(view, firstProp);

  is(
    await getComputedStyleProperty(id, ":first-line", "background-color"),
    "rgb(0, 255, 0)",
    "Added property should have been used."
  );
  is(
    await getComputedStyleProperty(id, null, "text-decoration-line"),
    "none",
    "Added property should not apply to element"
  );

  await addProperty(view, 7, "background-color", "rgb(0, 0, 255)");

  is(
    await getComputedStyleProperty(id, null, "background-color"),
    "rgb(0, 0, 255)",
    "Added property should have been used."
  );
  is(
    await getComputedStyleProperty(id, ":first-line", "background-color"),
    "rgb(0, 255, 0)",
    "Added prop does not apply to pseudo"
  );

  // This will also ensure that the pseudo elements are hidden before switching to another test
  info("Make sure that clicking on the twity re-hide the pseudo elements");
  // Retrieve a fresh reference to the pseudo elements expander as the DOM Element may have been replaced
  const expander = view.element.querySelector(
    ".ruleview-header:not([hidden]) .ruleview-expander"
  );

  ok(!getPseudoElementContainer(view).hidden, "Pseudo Elements are expanded");

  expander.click();
  ok(
    getPseudoElementContainer(view).hidden,
    "Pseudo Elements are collapsed by twisty"
  );
  is(
    expander.closest("button").ariaExpanded,
    "false",
    "pseudo element section is now collapsed"
  );
}

async function testTopRight(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    "#topright",
    inspector,
    view,
    {
      elementRules: 4,
      firstLineRules: 1,
      firstLetterRules: 1,
      selectionRules: 0,
      markerRules: 0,
      beforeRules: 2,
      afterRules: 1,
    }
  );

  const gutters = assertHeaders(view);

  const expander = gutters[0].querySelector(".ruleview-expander");
  ok(
    getPseudoElementContainer(view).hidden,
    "Pseudo Elements remain collapsed after switching element"
  );

  expander.scrollIntoView();
  expander.click();
  ok(
    !getPseudoElementContainer(view).hidden,
    "Pseudo Elements are shown again after clicking twisty"
  );
}

async function testBottomRight(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    "#bottomright",
    inspector,
    view,
    {
      elementRules: 4,
      firstLineRules: 1,
      firstLetterRules: 1,
      selectionRules: 0,
      markerRules: 0,
      beforeRules: 3,
      afterRules: 1,
    }
  );
}

async function testBottomLeft(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    "#bottomleft",
    inspector,
    view,
    {
      elementRules: 4,
      firstLineRules: 1,
      firstLetterRules: 1,
      selectionRules: 0,
      markerRules: 0,
      beforeRules: 2,
      afterRules: 1,
    }
  );
}

async function testParagraph(inspector, view) {
  const rules = await assertPseudoElementRulesNumbersForSelector(
    "#bottomleft p",
    inspector,
    view,
    {
      elementRules: 3,
      firstLineRules: 1,
      firstLetterRules: 1,
      selectionRules: 2,
      markerRules: 0,
      beforeRules: 0,
      afterRules: 0,
    }
  );

  assertHeaders(view);

  const elementFirstLineRule = rules.firstLineRules[0];
  is(
    convertTextPropsToString(elementFirstLineRule.textProps),
    "background: blue",
    "Paragraph first-line properties are correct"
  );

  const elementFirstLetterRule = rules.firstLetterRules[0];
  is(
    convertTextPropsToString(elementFirstLetterRule.textProps),
    "color: red; font-size: 130%",
    "Paragraph first-letter properties are correct"
  );

  const elementSelectionRule = rules.selectionRules[0];
  is(
    convertTextPropsToString(elementSelectionRule.textProps),
    "color: white; background: black",
    "Paragraph first-letter properties are correct"
  );
}

async function testBody(inspector, view) {
  await selectNode("body", inspector);

  assertRuleViewHeaders(view, []);
}

async function testListAfterElement(inspector, view) {
  // Test that ::after::marker is displayed in the pseudo element section when
  // selecting the #list::after node.
  const listNode = await getNodeFront("#list", inspector);
  const listChildren = await inspector.markup.walker.children(listNode);
  const listAfterNode = listChildren.nodes.at(-1);
  is(
    listAfterNode.tagName,
    "_moz_generated_content_after",
    "tag name is correct for #list::after"
  );
  await selectNode(listAfterNode, inspector);

  await assertPseudoElementRulesNumbers(view, "#list::after", {
    elementRules: 3,
    markerRules: 1,
  });

  assertRuleViewHeaders(view, [
    "Pseudo-elements",
    "This Element",
    "Inherited from ol#list",
    "Inherited from body",
  ]);
}

async function testListItem(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    "#list-item",
    inspector,
    view,
    {
      elementRules: 4,
      firstLineRules: 1,
      firstLetterRules: 1,
      selectionRules: 0,
      markerRules: 1,
      beforeRules: 1,
      afterRules: 1,
    }
  );

  assertHeaders(view);
}

async function testBackdrop(inspector, view) {
  info("Test ::backdrop for dialog element");
  await assertPseudoElementRulesNumbersForSelector("dialog", inspector, view, {
    elementRules: 3,
    backdropRules: 1,
  });

  info("Test ::backdrop for popover element");
  await assertPseudoElementRulesNumbersForSelector(
    "#in-dialog[popover]",
    inspector,
    view,
    {
      elementRules: 3,
      backdropRules: 1,
    }
  );

  assertHeaders(view);

  info("Test ::backdrop rules are displayed when elements is fullscreen");

  // Wait for the document being activated, so that
  // fullscreen request won't be denied.
  const onTabFocused = SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    return ContentTaskUtils.waitForCondition(
      () => content.browsingContext.isActive && content.document.hasFocus(),
      "document is active"
    );
  });
  gBrowser.selectedBrowser.focus();
  await onTabFocused;

  info("Request fullscreen");
  // Entering fullscreen is triggering an update, wait for it so it doesn't impact
  // the rest of the test
  let onInspectorUpdated = inspector.once("rule-view-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const canvas = content.document.querySelector("canvas");
    canvas.requestFullscreen();

    await ContentTaskUtils.waitForCondition(
      () => content.document.fullscreenElement === canvas,
      "canvas is fullscreen"
    );
  });
  await onInspectorUpdated;

  await assertPseudoElementRulesNumbersForSelector("canvas", inspector, view, {
    elementRules: 3,
    backdropRules: 1,
  });

  assertHeaders(view);

  // Exiting fullscreen is triggering an update, wait for it so it doesn't impact
  // the rest of the test
  onInspectorUpdated = inspector.once("rule-view-refreshed");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.document.exitFullscreen();
    await ContentTaskUtils.waitForCondition(
      () => content.document.fullscreenElement === null,
      "canvas is no longer fullscreen"
    );
  });
  await onInspectorUpdated;

  info(
    "Test ::backdrop rules are not displayed when elements are not fullscreen"
  );
  await assertPseudoElementRulesNumbersForSelector("canvas", inspector, view, {
    elementRules: 3,
    backdropRules: 0,
  });
}

async function testCustomHighlight(inspector, view) {
  const { highlightRules } = await assertPseudoElementRulesNumbersForSelector(
    ".highlights-container",
    inspector,
    view,
    {
      elementRules: 4,
      highlightRules: 3,
    }
  );

  is(
    highlightRules[0].pseudoElement,
    "::highlight(search)",
    "First highlight rule is for the search highlight"
  );
  is(
    highlightRules[1].pseudoElement,
    "::highlight(search)",
    "Second highlight rule is also for the search highlight"
  );
  is(
    highlightRules[2].pseudoElement,
    "::highlight(filter)",
    "Third highlight rule is for the filter highlight"
  );
  is(highlightRules.length, 3, "Got all 3 active rules, but not unused one");

  // Check that properties are marked as overridden only when they're on the same Highlight
  is(
    convertTextPropsToString(highlightRules[0].textProps),
    `color: white`,
    "Got expected properties for first search highlight"
  );
  is(
    convertTextPropsToString(highlightRules[1].textProps),
    `background-color: tomato; ~~color: gold~~`,
    "Got expected properties for second search highlight, `color` is marked as overridden"
  );
  is(
    convertTextPropsToString(highlightRules[2].textProps),
    `background-color: purple`,
    "Got expected properties for filter highlight"
  );

  assertHeaders(view);
}

async function testSlider(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    "input[type=range].slider",
    inspector,
    view,
    {
      elementRules: 3,
      sliderFillRules: 1,
      sliderThumbRules: 1,
      sliderTrackRules: 1,
    }
  );
  assertHeaders(view);

  info(
    "Check that ::slider-* pseudo elements are not displayed for non-range inputs"
  );
  await assertPseudoElementRulesNumbersForSelector(
    "input[type=text].slider",
    inspector,
    view,
    {
      elementRules: 3,
      sliderFillRules: 0,
      sliderThumbRules: 0,
      sliderTrackRules: 0,
    }
  );
}

async function testUrlFragmentTextDirective(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector(
    ".url-fragment-text-directives",
    inspector,
    view,
    {
      elementRules: 3,
      targetTextRules: 1,
    }
  );
  assertHeaders(view);
}

async function testDetailsContent(inspector, view) {
  await assertPseudoElementRulesNumbersForSelector("details", inspector, view, {
    // `element`, `*`, and inherited `body`
    elementRules: 3,
    detailsContentRules: 1,
  });
  assertHeaders(view);
}

async function testCustomizableSelect(inspector, view) {
  info("Test ::picker-icon and ::picker for select element");
  await assertPseudoElementRulesNumbersForSelector(
    "#customizable-select",
    inspector,
    view,
    {
      elementRules: 3,
      pickerIconRules: 1,
      pickerRules: 1,
    }
  );
  assertHeaders(view);

  info("Test ::checkmark for option element");
  await assertPseudoElementRulesNumbersForSelector(
    "#customizable-select-option",
    inspector,
    view,
    {
      elementRules: 3,
      checkmarkRules: 1,
    }
  );
  assertHeaders(view);
}

function convertTextPropsToString(textProps) {
  return textProps
    .map(
      t =>
        `${t.overridden ? "~~" : ""}${t.name}: ${t.value}${
          t.overridden ? "~~" : ""
        }`
    )
    .join("; ");
}

const PSEUDO_DICT = {
  firstLineRules: "::first-line",
  firstLetterRules: "::first-letter",
  selectionRules: "::selection",
  markerRules: "::marker",
  beforeRules: "::before",
  afterRules: "::after",
  backdropRules: "::backdrop",
  highlightRules: "::highlight",
  sliderFillRules: "::slider-fill",
  sliderThumbRules: "::slider-thumb",
  sliderTrackRules: "::slider-track",
  targetTextRules: "::target-text",
  detailsContentRules: "::details-content",
  pickerIconRules: "::picker-icon",
  pickerRules: "::picker",
  checkmarkRules: "::checkmark",
};

async function assertPseudoElementRulesNumbersForSelector(
  selector,
  inspector,
  view,
  ruleNbs
) {
  await selectNode(selector, inspector);
  return assertPseudoElementRulesNumbers(view, selector, ruleNbs);
}

async function assertPseudoElementRulesNumbers(
  view,
  elementDescription,
  ruleNbs
) {
  // Wait for the expected pseudo classes to be displayed
  await waitFor(() =>
    Object.entries(ruleNbs).every(([key, nb]) => {
      if (!PSEUDO_DICT[key]) {
        return true;
      }
      return (
        Array.from(
          view.element.querySelectorAll(".ruleview-selector-pseudo-class")
        ).filter(el => el.textContent.startsWith(PSEUDO_DICT[key])).length ===
        nb
      );
    })
  );

  const rules = {
    elementRules: view.elementStyle.rules.filter(rule => !rule.pseudoElement),
    ...Object.fromEntries(
      Object.entries(PSEUDO_DICT).map(([key, pseudoElementSelector]) => [
        key,
        view.elementStyle.rules.filter(rule =>
          rule.pseudoElement.startsWith(pseudoElementSelector)
        ),
      ])
    ),
  };

  is(
    rules.elementRules.length,
    ruleNbs.elementRules || 0,
    elementDescription + " has the correct number of non pseudo element rules"
  );

  // Go through all the pseudo element types and assert that we have the expected number
  for (const key in PSEUDO_DICT) {
    is(
      rules[key].length,
      ruleNbs[key] || 0,
      `${elementDescription} has the correct number of ${key} rules`
    );
  }

  return rules;
}

function assertHeaders(view) {
  return assertRuleViewHeaders(view, [
    "Pseudo-elements",
    "This Element",
    "Inherited from body",
  ]);
}

/**
 * Get the DOM Element containing all pseudo element rules.
 *
 * @param {RuleView} view
 */
function getPseudoElementContainer(view) {
  return view.element.querySelector("#pseudo-elements-container");
}
