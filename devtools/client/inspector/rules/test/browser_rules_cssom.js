/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test to ensure that CSSOM doesn't make the rule view blow up.
// https://bugzilla.mozilla.org/show_bug.cgi?id=1224121

const TEST_URI = URL_ROOT + "doc_cssom.html";

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();
  await selectNode("#target", inspector);

  const elementStyle = view.elementStyle;
  let rule;

  rule = elementStyle.rules[1];
  is(rule.textProps.length, 1, "rule 1 should have one property");
  is(rule.textProps[0].name, "color", "the property should be 'color'");
  is(rule.ruleLine, 1, "the property has no source line");

  rule = elementStyle.rules[2];
  is(rule.textProps.length, 1, "rule 2 should have one property");
  is(
    rule.textProps[0].name,
    "font-weight",
    "the property should be 'font-weight'"
  );
  is(rule.ruleLine, 2, "the property has no source line");

  info("Check that updating cssom declaration works");
  // Testing Bug 1933473
  const prop = getTextProperty(view, 1, { color: "seagreen" });
  await setProperty(view, prop, "red");
  is(
    await getComputedStyleProperty("#target", null, "color"),
    "rgb(255, 0, 0)",
    "target element color was properly updated"
  );

  info("Select another node and re-select target node to update the rule view");
  await selectNode("body", inspector);
  await selectNode("#target", inspector);

  const newProp = getTextProperty(view, 1, { color: "red" });
  ok(!!newProp, "Rule is still visible after updating it");

  info("Check that updating cssom declaration in shadow DOM works");
  // Testing Bug 1986702
  const shadowDomH2NodeFront = await getNodeFrontInShadowDom(
    "h2",
    "#host",
    inspector
  );
  await selectNode(shadowDomH2NodeFront, inspector);

  const shadowDomH2ColorProp = getTextProperty(view, 1, { color: "tomato" });
  await setProperty(view, shadowDomH2ColorProp, "blue");

  const shadowDomH2Color = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      return content
        .getComputedStyle(
          content.document.getElementById("host").shadowRoot.querySelector("h2")
        )
        .getPropertyValue("color");
    }
  );
  is(
    shadowDomH2Color,
    "rgb(0, 0, 255)",
    "shadow DOM h2 element color was properly updated"
  );

  info(
    "Select another node and re-select shadow DOM h2 node to update the rule view"
  );
  await selectNode("body", inspector);
  await selectNode(shadowDomH2NodeFront, inspector);

  const updatedShadowDomH2Prop = getTextProperty(view, 1, { color: "blue" });
  ok(!!updatedShadowDomH2Prop, "Rule is still visible after updating it");
});
