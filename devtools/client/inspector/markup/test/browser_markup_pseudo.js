/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URL = URL_ROOT + "doc_markup_pseudo.html";

// Test that reloading the page when an element with sibling pseudo elements is selected
// does not result in missing elements in the markup-view after reload.
// Non-regression test for bug 1506792.
add_task(async function testReload() {
  const { inspector } = await openInspectorForURL(TEST_URL);

  await selectNode("div", inspector);

  info("Check that the markup-view shows the expected nodes before reload");
  await checkMarkupView(inspector);

  await reloadSelectedTab();

  info("Check that the markup-view shows the expected nodes after reload");
  await checkMarkupView(inspector);
});

// Test ::before::marker
add_task(async function testMarkerOnPseudo() {
  const { inspector } = await openInspectorForURL(TEST_URL);

  await selectNode("ul", inspector);

  const ulNodeFront = await getNodeFront("ul", inspector);
  const ulContainer = await getContainerForNodeFront(ulNodeFront, inspector);
  is(
    ulContainer.expander.style.visibility,
    "visible",
    "Expander button is visible for <ul>"
  );

  info("Click on the <ul> parent expander and wait for children");
  await toggleContainerByClick(inspector, ulContainer);
  ok(ulContainer.expanded, "Parent UL container is expanded");

  const { nodes: ulChildren } = await inspector.walker.children(ulNodeFront);
  const ulBeforeNodeFront = ulChildren[0];
  is(
    ulBeforeNodeFront.displayName,
    "::before",
    "Got expexected ul::before pseudo element"
  );
  const ulBeforeContainer = await getContainerForNodeFront(
    ulBeforeNodeFront,
    inspector
  );
  is(
    ulBeforeContainer.expander.style.visibility,
    "visible",
    "Expander button is visible for ul::before"
  );

  info("Click on the ul::before expander and wait for children");
  await toggleContainerByClick(inspector, ulBeforeContainer);
  const { nodes: ulBeforeChildren } =
    await inspector.walker.children(ulBeforeNodeFront);
  const ulBeforeMarkerNodeFront = ulBeforeChildren[0];
  is(
    ulBeforeMarkerNodeFront.displayName,
    "::marker",
    "Got expexected ul::before::marker pseudo element"
  );
  const ulBeforeMarkerContainer = await getContainerForNodeFront(
    ulBeforeMarkerNodeFront,
    inspector
  );
  ok(!!ulBeforeMarkerContainer, "Got a container for ::before::marker");
  is(
    ulBeforeMarkerContainer.expander.style.visibility,
    "hidden",
    "Expander button is not visible for ul::before::marker"
  );

  const ulAfterNodeFront = ulChildren[3];
  is(
    ulAfterNodeFront.displayName,
    "::after",
    "Got expexected ul::after pseudo element"
  );
  const ulAfterContainer = await getContainerForNodeFront(
    ulAfterNodeFront,
    inspector
  );
  is(
    ulAfterContainer.expander.style.visibility,
    "hidden",
    "Expander button is not visible for ul::after"
  );

  await selectNode("dialog", inspector);

  const dialogNodeFront = await getNodeFront("dialog", inspector);
  const dialogContainer = await getContainerForNodeFront(
    dialogNodeFront,
    inspector
  );
  is(
    ulContainer.expander.style.visibility,
    "visible",
    "Expander button is visible for <dialog>"
  );

  info("Click on the <dialog> parent expander and wait for children");
  await toggleContainerByClick(inspector, dialogContainer);

  let tree = `
    html
      head!ignore-children
      body
        article!ignore-children
        ul!ignore-children
        dialog
          p
      `.trim();
  await assertMarkupViewAsTree(tree, "html", inspector);

  info("Show the dialog modal and wait for mutation");
  let onMarkupMutation = inspector.once("markupmutation");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document.querySelector("dialog").showModal();
  });
  await onMarkupMutation;

  info(
    "Check that both the ::backdrop and ::before element are now displayed under <dialog>"
  );
  tree = `
    html
      head!ignore-children
      body
        article!ignore-children
        ul!ignore-children
        dialog
          ::backdrop
          ::before
          p
      `.trim();
  await assertMarkupViewAsTree(tree, "html", inspector);

  info("Hide the dialog modal and wait for mutation");
  onMarkupMutation = inspector.once("markupmutation");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], () => {
    content.document.querySelector("dialog").close();
  });
  await onMarkupMutation;

  info(
    "Check that both the <dialog> ::backdrop and ::before children gets removed"
  );
  tree = `
    html
      head!ignore-children
      body
        article!ignore-children
        ul!ignore-children
        dialog
          p
      `.trim();
  await assertMarkupViewAsTree(tree, "html", inspector);
});

async function checkMarkupView(inspector) {
  const articleContainer = await getContainerForSelector("article", inspector);
  ok(articleContainer, "The parent <article> element was found");

  const childrenContainers = articleContainer.getChildContainers();
  const beforeNode = childrenContainers[0].node;
  const divNode = childrenContainers[1].node;
  const afterNode = childrenContainers[2].node;

  is(
    beforeNode.displayName,
    "::before",
    "The first child is the ::before pseudo element"
  );
  is(divNode.displayName, "div", "The second child is the <div> element");
  is(
    afterNode.displayName,
    "::after",
    "The last child is the ::after pseudo element"
  );
}
