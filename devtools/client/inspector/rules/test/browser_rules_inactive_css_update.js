/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that a declaration's inactive state doesn't linger on its previous state when
// the declaration it depends on changes. Bug 1593944,  Bug 2017242

const TEST_URI = `
<style>
  div {
    justify-content: center;
    /*! display: flex */
  }
  h1 {
    position-area: center;
  }
  :where(h1) {
    /*!position: absolute*/
  }
</style>
<h1>Inactive CSS update</h1>
<div>`;

add_task(async function () {
  // needed to reproduce the original issue from Bug 2017242
  await pushPref("devtools.inspector.activeSidebar", "computedview");
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, view } = await openRuleView();

  await selectNode("div", inspector);

  const justifyContent = { "justify-content": "center" };
  const justifyItems = { "justify-items": "center" };
  const displayFlex = { display: "flex" };
  const displayGrid = { display: "grid" };

  info("Enable display:flex and check that justify-content becomes active");
  await checkDeclarationIsInactive(
    view,
    1,
    justifyContent,
    "inactive-css-not-grid-or-flex-container"
  );
  await toggleDeclaration(view, 1, displayFlex);
  await checkDeclarationIsActive(view, 1, justifyContent);

  info(
    "Rename justify-content to justify-items and check that it becomes inactive"
  );
  await updateDeclaration(view, 1, justifyContent, justifyItems);
  await checkDeclarationIsInactive(
    view,
    1,
    justifyItems,
    "inactive-css-not-grid-container"
  );

  info(
    "Rename display:flex to display:grid and check that justify-items becomes active"
  );
  await updateDeclaration(view, 1, displayFlex, displayGrid);
  await checkDeclarationIsActive(view, 1, justifyItems);

  info("Check that position-area declaration is inactive");
  await selectNode("h1", inspector);
  await checkDeclarationIsInactive(
    view,
    1,
    { "position-area": "center" },
    "inactive-css-not-absolutely-positioned-item"
  );

  info(
    "Enable position:absolute and check that position-area is still inactive and that the tooltip has a different content"
  );
  await toggleDeclaration(view, 2, { position: "absolute" });
  await checkDeclarationIsInactive(
    view,
    1,
    { "position-area": "center" },
    "inactive-css-no-default-anchor"
  );
});
