/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests adding a new rule and a new property in this rule.

add_task(async function () {
  await addTab(
    "data:text/html;charset=utf-8,<div id='testid'>Styled Node</div>"
  );
  const { inspector, view } = await openRuleView();

  info("Selecting the test node");
  await selectNode("#testid", inspector);

  info("Adding a new rule for this node and blurring the new selector field");
  await addNewRuleAndDismissEditor(inspector, view, "#testid", 1);

  info("Adding a new property for this rule");
  await addProperty(view, 1, "font-weight", "bold");

  info(
    "Add another rule to make sure we reuse the stylesheet we created the first time we added a rule"
  );
  await addNewRuleAndDismissEditor(inspector, view, "#testid", 1);

  const styleSheetsCount = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => content.document.styleSheets.length
  );
  is(styleSheetsCount, 1, "Only one stylesheet was created in the document");
});
