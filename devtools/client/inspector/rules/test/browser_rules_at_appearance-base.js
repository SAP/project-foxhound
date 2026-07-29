/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that we correctly display @appearance-base rules in the rule view.
const TEST_URI = `data:text/html,<meta charset=utf8>${encodeURIComponent(`
  <input id="regular" type="file" />
  <input id="base" type="file" style="appearance: base;" />
`)}`;

add_task(async function () {
  // @appearance-base rule are only valid in UA stylesheets
  await pushPref("layout.css.appearance-base.enabled", true);
  await pushPref("devtools.inspector.showUserAgentStyles", true);
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  await selectNode("#base", inspector);
  // for some reason, those might not be rendered directly and we need to wait a bit
  const appearanceBaseEls = await waitFor(() => {
    const res = getAppearanceBaseAncestorElements(view);
    return res.length ? res : false;
  });

  // Since those are added in a UA stylesheet, it would make the test brittle to check
  // for specific rules, so we only check that we have "some".
  Assert.greaterOrEqual(
    appearanceBaseEls.length,
    2,
    "Got @appearance-base rules for appearance: base input"
  );

  Assert.greaterOrEqual(
    appearanceBaseEls.filter(el => !!el.closest("#element-container")).length,
    1,
    "Got at least one @appearance-base rule applying directly on the input"
  );
  Assert.greaterOrEqual(
    appearanceBaseEls.filter(el => !!el.closest("#pseudo-elements-container"))
      .length,
    1,
    "Got at least one @appearance-base rule applying on the ::file-selector-button pseudo element"
  );

  await selectNode("#regular", inspector);
  is(
    getAppearanceBaseAncestorElements(view).length,
    0,
    "No @appearance-base rules are visible for regular inputs"
  );
});

function getAppearanceBaseAncestorElements(view) {
  return Array.from(
    view.element.querySelectorAll(".ruleview-rule-ancestor-data")
  ).filter(el => el.innerText.includes("@appearance-base {"));
}
