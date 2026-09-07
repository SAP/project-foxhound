/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test that the breadcrumbs widget content is correct.

const TEST_URI = URL_ROOT + "doc_inspector_breadcrumbs.html";
const NODES = [
  {
    selector: "#i1111",
    ids: "i1 i11 i111 i1111",
    nodeName: "div",
    title: "div#i1111",
  },
  { selector: "#i22", ids: "i2 i22", nodeName: "div", title: "div#i22" },
  {
    selector: "#i2111",
    ids: "i2 i21 i211 i2111",
    nodeName: "div",
    title: "div#i2111",
  },
  {
    selector: "#i21",
    ids: "i2 i21 i211 i2111",
    nodeName: "div",
    title: "div#i21",
  },
  {
    selector: "#i22211",
    ids: "i2 i22 i222 i2221 i22211",
    nodeName: "div",
    title: "div#i22211",
  },
  {
    selector: "#i22",
    ids: "i2 i22 i222 i2221 i22211",
    nodeName: "div",
    title: "div#i22",
  },
  { selector: "#i3", ids: "i3", nodeName: "article", title: "article#i3" },
  {
    selector: "clipPath",
    ids: "vector clip",
    nodeName: "clipPath",
    title: "clipPath#clip",
  },
];

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URI);
  const breadcrumbs = inspector.panelDoc.getElementById(
    "inspector-breadcrumbs"
  );
  const container = breadcrumbs.querySelector(".html-arrowscrollbox-inner");

  for (const node of NODES) {
    info("Testing node " + node.selector);

    info("Selecting node and waiting for breadcrumbs to update");
    const breadcrumbsUpdated = inspector.once("breadcrumbs-updated");
    await selectNode(node.selector, inspector);
    await breadcrumbsUpdated;

    info("Performing checks for node " + node.selector);
    const buttonsLabelIds = node.ids.split(" ");

    // html > body > …
    is(
      container.childNodes.length,
      buttonsLabelIds.length + 2,
      "Node " + node.selector + ": Items count"
    );

    for (let i = 2; i < container.childNodes.length; i++) {
      const expectedId = "#" + buttonsLabelIds[i - 2];
      const button = container.childNodes[i];
      const labelId = button.querySelector(".breadcrumbs-widget-item-id");
      is(
        labelId.textContent,
        expectedId,
        "Node " + node.selector + ": button " + i + " matches"
      );
    }

    const pressedButton = container.querySelector(
      `button[aria-pressed="true"]`
    );
    const labelId = pressedButton.querySelector(".breadcrumbs-widget-item-id");
    const id = inspector.selection.nodeFront.id;
    is(
      labelId.textContent,
      "#" + id,
      "Node " + node.selector + ": selection matches"
    );

    const labelTag = pressedButton.querySelector(
      ".breadcrumbs-widget-item-tag"
    );
    is(
      labelTag.textContent,
      node.nodeName,
      "Node " + node.selector + " has the expected tag name"
    );

    is(
      pressedButton.getAttribute("title"),
      node.title,
      "Node " + node.selector + " has the expected tooltip"
    );
  }

  await testPseudoElements(inspector, container);
  await testComments(inspector, container);
});

async function testPseudoElements(inspector, container) {
  info("Checking for pseudo elements");

  const checkBreadcrumbContent = async (nodeFront, expected, desc) => {
    const onBreadcrumbsUpdated = inspector.once("breadcrumbs-updated");
    await selectNode(nodeFront, inspector);
    await onBreadcrumbsUpdated;
    Assert.deepEqual(
      [...container.childNodes].map(el => el.textContent),
      expected,
      desc
    );
  };

  const pseudoParent = await getNodeFront("#pseudo-container", inspector);
  const children = await inspector.walker.children(pseudoParent);
  is(children.nodes.length, 2, "Pseudo children returned from walker");

  const beforeElement = children.nodes[0];
  await checkBreadcrumbContent(
    beforeElement,
    ["html", "body", "div#pseudo-container", "::before"],
    "::before shows up in breadcrumb"
  );

  const afterElement = children.nodes[1];
  await checkBreadcrumbContent(
    afterElement,
    ["html", "body", "div#pseudo-container", "::after"],
    "::after shows up in breadcrumb"
  );

  const dialogNodeFront = await getNodeFront("dialog", inspector);
  const dialogChildren = await inspector.walker.children(dialogNodeFront);
  is(
    dialogChildren.nodes.length,
    2,
    "Expected number of children for the dialog element"
  );
  const backdropElement = dialogChildren.nodes[0];
  await checkBreadcrumbContent(
    backdropElement,
    ["html", "body", "dialog", "::backdrop"],
    ":backdrop shows up in breadcrumb"
  );

  info("Check rules on ::view-transition");
  const htmlNodeFront = await getNodeFront("html", inspector);
  const onMarkupMutation = inspector.once("markupmutation");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const document = content.document;
    content.testTransition = document.startViewTransition();
    await content.testTransition;
  });
  await onMarkupMutation;

  const htmlChildren = await inspector.markup.walker.children(htmlNodeFront);
  const viewTransitionNodeFront = htmlChildren.nodes[2];

  is(
    viewTransitionNodeFront.getAttribute("type"),
    ":view-transition",
    "Got expected ::view-transition node front"
  );

  await checkBreadcrumbContent(
    viewTransitionNodeFront,
    ["html", "::view-transition"],
    "::view-transition shows up in breadcrumb"
  );

  const viewTransitionChildren = await inspector.markup.walker.children(
    viewTransitionNodeFront
  );
  const viewTransitionGroupNodeFront = viewTransitionChildren.nodes[0];
  is(
    viewTransitionGroupNodeFront.getAttribute("type"),
    ":view-transition-group",
    "Got expected ::view-transition-group node front"
  );

  await checkBreadcrumbContent(
    viewTransitionGroupNodeFront,
    ["html", "::view-transition", "::view-transition-group(root)"],
    "::view-transition-group(root) shows up in breadcrumb"
  );

  const viewTransitionGroupChildren = await inspector.markup.walker.children(
    viewTransitionGroupNodeFront
  );
  const viewTransitionImagePairNodeFront = viewTransitionGroupChildren.nodes[0];
  is(
    viewTransitionImagePairNodeFront.getAttribute("type"),
    ":view-transition-image-pair",
    "Got expected ::view-transition-image-pair node front"
  );

  await checkBreadcrumbContent(
    viewTransitionImagePairNodeFront,
    [
      "html",
      "::view-transition",
      "::view-transition-group(root)",
      "::view-transition-image-pair(root)",
    ],
    "::view-transition-image-pair(root) shows up in breadcrumb"
  );

  const viewTransitionImagePairChildren =
    await inspector.markup.walker.children(viewTransitionImagePairNodeFront);
  const [viewTransitionOldNodeFront, viewTransitionNewNodeFront] =
    viewTransitionImagePairChildren.nodes;
  is(
    viewTransitionOldNodeFront.getAttribute("type"),
    ":view-transition-old",
    "Got expected ::view-transition-old node front"
  );
  is(
    viewTransitionNewNodeFront.getAttribute("type"),
    ":view-transition-new",
    "Got expected ::view-transition-new node front"
  );

  await checkBreadcrumbContent(
    viewTransitionOldNodeFront,
    [
      "html",
      "::view-transition",
      "::view-transition-group(root)",
      "::view-transition-image-pair(root)",
      "::view-transition-old(root)",
    ],
    "::view-transition-old(root) shows up in breadcrumb"
  );

  await checkBreadcrumbContent(
    viewTransitionNewNodeFront,
    [
      "html",
      "::view-transition",
      "::view-transition-group(root)",
      "::view-transition-image-pair(root)",
      "::view-transition-new(root)",
    ],
    "::view-transition-new(root) shows up in breadcrumb"
  );

  // Cancel transition
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.testTransition.skipTransition();
    delete content.testTransition;
  });
}

async function testComments(inspector, container) {
  info("Checking for comment elements");

  const breadcrumbs = inspector.breadcrumbs;
  const pressedButtonIndex = 2;
  const button = container.childNodes[pressedButtonIndex];

  let onBreadcrumbsUpdated = inspector.once("breadcrumbs-updated");
  // Don't use button.click(), as it doesn't cause the focus event to be dispatched, which
  // we do need here.
  EventUtils.synthesizeMouseAtCenter(button, {}, inspector.panelWin);
  await onBreadcrumbsUpdated;

  is(breadcrumbs.currentIndex, pressedButtonIndex, "New button is selected");
  ok(
    breadcrumbs.outer.hasAttribute("aria-activedescendant"),
    "Active descendant must be set"
  );

  const comment = [...inspector.markup._containers].find(
    ([node]) => node.nodeType === Node.COMMENT_NODE
  )[0];

  let onInspectorUpdated = inspector.once("inspector-updated");
  inspector.selection.setNodeFront(comment);
  await onInspectorUpdated;

  is(
    breadcrumbs.currentIndex,
    -1,
    "When comment is selected no breadcrumb should be pressed"
  );
  ok(
    !breadcrumbs.outer.hasAttribute("aria-activedescendant"),
    "Active descendant must not be set"
  );

  onInspectorUpdated = inspector.once("inspector-updated");
  onBreadcrumbsUpdated = inspector.once("breadcrumbs-updated");
  // Don't use button.click(), as it doesn't cause the focus event to be dispatched, which
  // we do need here.
  EventUtils.synthesizeMouseAtCenter(button, {}, inspector.panelWin);
  await Promise.all([onInspectorUpdated, onBreadcrumbsUpdated]);

  is(
    breadcrumbs.currentIndex,
    pressedButtonIndex,
    "Same button is selected again"
  );
  ok(
    breadcrumbs.outer.hasAttribute("aria-activedescendant"),
    "Active descendant must be set again"
  );
}
