/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view shows expanders for properties with computed lists.

var TEST_URI = `
  <style type="text/css">
    #testid {
      margin: 4px;
      top: 0px;
    }
  </style>
  <h1 id="testid">Styled Node</h1>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();
  await selectNode("#testid", inspector);
  const rule = getRuleViewRuleEditor(view, 1).rule;

  info("Check that the correct rules are visible");
  is(rule.selectorText, "#testid", "Second rule is #testid.");
  const [marginProp, topProp] = rule.textProps;
  is(marginProp.name, "margin", "First property is margin.");
  is(topProp.name, "top", "Second property is top.");

  info("Check that the expanders are shown correctly");
  ok(marginProp.editor.expander, "margin expander is rendered.");
  is(
    marginProp.editor.expander.hidden,
    false,
    "margin expander is not hidden."
  );
  ok(!topProp.editor.expander, "top expander is not rendered.");
  ok(
    !marginProp.editor.expander.hasAttribute("open"),
    "margin computed list is closed."
  );
  ok(
    !marginProp.editor.computed,
    "margin computed list does not exist before opening."
  );
  ok(!topProp.editor.computed, "top computed list is not rendered.");

  info("Check that the expander gets hidden when the declaration is edited");
  await focusEditableField(view, marginProp.editor.valueSpan);
  is(
    marginProp.editor.expander.hidden,
    true,
    "margin expander is hidden when the value is edited"
  );

  info("Check that the expander gets shown again after we're done editing");
  let onEditingCancelled = view.once("ruleview-changed");
  EventUtils.sendKey("ESCAPE", view.styleWindow);
  await onEditingCancelled;
  is(
    marginProp.editor.expander.hidden,
    false,
    "margin expander is visible again after editing is over"
  );

  info(
    "Check that the expander can be visible after editing the property name"
  );
  await focusEditableField(view, topProp.editor.nameSpan);
  // Entering a new property name, including : to commit and focus the value
  const onValueFocus = once(rule.editor.element, "focus", true);
  const onNameDone = view.once("ruleview-changed");
  EventUtils.sendString("inset:", view.styleWindow);
  await onNameDone;
  await onValueFocus;

  // the value span was focused, cancel the edit
  onEditingCancelled = view.once("ruleview-changed");
  EventUtils.sendKey("ESCAPE", view.styleWindow);
  await onEditingCancelled;

  ok(
    topProp.editor.expander,
    "the expander was created for the `inset` property (prev `top`)"
  );
  is(
    topProp.editor.expander.hidden,
    false,
    "the expander is visible for the `inset` property"
  );
});
