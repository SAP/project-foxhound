/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that pseudo elements rules are displayed correctly in Rules view.

const TEST_URI = URL_ROOT + "doc_pseudoelement.html";

add_task(async function () {
  await addTab(TEST_URI);
  const { inspector, view } = await openRuleView();

  const node = await getNodeFront("#topleft", inspector);
  const children = await inspector.markup.walker.children(node);

  is(children.nodes.length, 3, "Element has correct number of children");

  info("Check rules on #topleft::before node");
  const beforeElement = children.nodes[0];
  is(beforeElement.displayName, "::before", "display name is correct");
  await selectNode(beforeElement, inspector);
  checkRuleViewContent(view, [
    {
      selector: `.topleft::before`,
      ancestorRulesData: null,
      declarations: [
        { name: "top", value: "0" },
        { name: "left", value: "0" },
      ],
    },
    {
      selector: `.box::before`,
      ancestorRulesData: null,
      declarations: [
        { name: "background", value: "green" },
        { name: "content", value: `" "` },
        { name: "position", value: `absolute` },
        { name: "height", value: `32px` },
        { name: "width", value: `32px` },
      ],
    },
    {
      header: "Inherited from div#topleft",
    },
    {
      selector: `*`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "color", value: "#333" }],
    },
  ]);

  info("Check rules on #topleft::after node");
  const afterElement = children.nodes.at(-1);
  is(afterElement.displayName, "::after", "display name is correct");
  await selectNode(afterElement, inspector);
  checkRuleViewContent(view, [
    {
      selector: `.box::after`,
      ancestorRulesData: null,
      declarations: [
        { name: "background", value: `red` },
        { name: "content", value: `" "` },
        { name: "position", value: `absolute` },
        { name: "border-radius", value: `50%` },
        { name: "height", value: `32px` },
        { name: "width", value: `32px` },
        { name: "top", value: `50%` },
        { name: "left", value: `50%` },
        { name: "margin-top", value: `-16px` },
        { name: "margin-left", value: `-16px` },
      ],
    },
    {
      header: "Inherited from div#topleft",
    },
    {
      selector: `*`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "color", value: "#333" }],
    },
  ]);

  info("Check #list children");
  const listNode = await getNodeFront("#list", inspector);
  const listChildren = await inspector.markup.walker.children(listNode);
  const listAfterNode = listChildren.nodes.at(-1);
  is(
    listAfterNode.displayName,
    "::after",
    "display name is correct for #list::after"
  );
  const listAfterChildren =
    await inspector.markup.walker.children(listAfterNode);
  is(
    listAfterChildren.nodes.length,
    1,
    "ol::after has the expected number of children"
  );
  const listAfterMarkerNode = listAfterChildren.nodes[0];
  is(
    listAfterMarkerNode.displayName,
    "::marker",
    "display name is correct for #list::after::marker"
  );
  info("Check rules on #list-item::marker node");
  await selectNode(listAfterMarkerNode, inspector);
  checkRuleViewContent(view, [
    {
      selector: `#list::after::marker`,
      ancestorRulesData: null,
      declarations: [
        { name: "content", value: `"+"` },
        { name: "color", value: `tomato` },
      ],
    },
    {
      header: "Inherited from ol#list",
    },
    {
      selector: `*`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "color", value: "#333", overridden: true }],
    },
  ]);

  info("Check #list-item children");
  const listItemNode = await getNodeFront("#list-item", inspector);
  const listItemChildren = await inspector.markup.walker.children(listItemNode);

  is(listItemChildren.nodes.length, 4, "<li> has correct number of children");

  info("Check rules on #list-item::marker node");
  const markerElement = listItemChildren.nodes[0];
  is(markerElement.displayName, "::marker", "display name is correct");
  await selectNode(markerElement, inspector);
  checkRuleViewContent(view, [
    {
      selector: `#list-item::marker`,
      ancestorRulesData: null,
      declarations: [{ name: "color", value: `purple` }],
    },
    {
      header: "Inherited from li#list-item",
    },
    {
      selector: `*`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "color", value: "#333", overridden: true }],
    },
  ]);

  info("Check rules on #list-item::before node");
  const listBeforeElement = listItemChildren.nodes[1];
  is(listBeforeElement.displayName, "::before", "display name is correct");
  await selectNode(listBeforeElement, inspector);
  checkRuleViewContent(view, [
    {
      selector: `.box::before`,
      ancestorRulesData: null,
      declarations: [
        { name: "background", value: "green" },
        { name: "content", value: `" "` },
        { name: "position", value: `absolute` },
        { name: "height", value: `32px` },
        { name: "width", value: `32px` },
      ],
    },
    {
      header: "Inherited from li#list-item",
    },
    {
      selector: `*`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      ancestorRulesData: null,
      inherited: true,
      declarations: [{ name: "color", value: "#333" }],
    },
  ]);

  info("Check unmatched selector parts in Pseudo element section");
  await selectNode("#with-unmatched-selector", inspector);
  checkRuleViewContent(view, [
    {
      header: `Pseudo-elements`,
    },
    {
      selector: `#with-unmatched-selector::before, ~~unknown::before~~, #with-unmatched-selector::after, ~~anotherunknown~~`,
      declarations: [{ name: "content", value: `"unmatched pseudo"` }],
    },
    {
      header: `This Element`,
    },
    {
      selector: `element`,
      declarations: [],
      selectorEditable: false,
    },
    {
      selector: `*`,
      declarations: [{ name: "cursor", value: "default" }],
    },
    {
      header: "Inherited from body",
    },
    {
      selector: `body`,
      inherited: true,
      declarations: [{ name: "color", value: "#333" }],
    },
  ]);

  info("Check rules on ::view-transition");
  const htmlNodeFront = await getNodeFront("html", inspector);

  const onMarkupMutation = inspector.once("markupmutation");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const document = content.document;
    const transition = document.startViewTransition(() => {
      document.querySelector(".transition").append("updated");
    });
    await transition.ready;
    await transition.updateCallbackDone;
  });
  await onMarkupMutation;

  const htmlChildren = await inspector.markup.walker.children(htmlNodeFront);
  const viewTransitionNodeFront = htmlChildren.nodes[2];

  is(
    viewTransitionNodeFront.getAttribute("type"),
    ":view-transition",
    "Got expected ::view-transition node front"
  );

  await selectNode(viewTransitionNodeFront, inspector);

  checkRuleViewContent(view, [
    {
      selector: `::view-transition`,
      declarations: [{ name: "color", value: `lime` }],
    },
    {
      header: "Inherited from html",
    },
    {
      selector: `html:active-view-transition`,
      inherited: true,
      declarations: [{ name: "color", value: "peachpuff", overridden: true }],
    },
    {
      selector: `*`,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
  ]);

  const viewTransitionChildren = await inspector.markup.walker.children(
    viewTransitionNodeFront
  );
  const viewTransitionGroupNodeFront = viewTransitionChildren.nodes[0];
  is(
    viewTransitionGroupNodeFront.getAttribute("type"),
    ":view-transition-group",
    "Got expected ::view-transition-group node front"
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

  info("Check rules on ::view-transition-old");
  await selectNode(viewTransitionOldNodeFront, inspector);
  checkRuleViewContent(view, [
    {
      selector: `::view-transition-old(root), ~~::view-transition-new(root)~~`,
      declarations: [
        { name: "animation-duration", value: `1000s` },
        { name: "top", value: `1em` },
        { name: "gap", value: `10px`, inactiveCSS: true },
      ],
    },
    {
      header: "Inherited from ::view-transition",
    },
    {
      selector: `::view-transition`,
      inherited: true,
      declarations: [{ name: "color", value: `lime` }],
    },
    {
      header: "Inherited from html",
    },
    {
      selector: `html:active-view-transition`,
      inherited: true,
      declarations: [{ name: "color", value: "peachpuff", overridden: true }],
    },
    {
      selector: `*`,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
  ]);

  info("Check rules on ::view-transition-new");
  await selectNode(viewTransitionNewNodeFront, inspector);
  checkRuleViewContent(view, [
    {
      selector: `::view-transition-new(root)`,
      declarations: [
        { name: "animation-duration", value: `3600s` },
        { name: "color", value: `thistle` },
      ],
    },
    {
      selector: `~~::view-transition-old(root)~~, ::view-transition-new(root)`,
      declarations: [
        { name: "animation-duration", value: `1000s`, overridden: true },
        {
          name: "top",
          value: `1em`,
        },
        { name: "gap", value: `10px`, inactiveCSS: true },
      ],
    },
    {
      header: "Inherited from ::view-transition",
    },
    {
      selector: `::view-transition`,
      inherited: true,
      declarations: [{ name: "color", value: `lime`, overridden: true }],
    },
    {
      header: "Inherited from html",
    },
    {
      selector: `html:active-view-transition`,
      inherited: true,
      declarations: [{ name: "color", value: "peachpuff", overridden: true }],
    },
    {
      selector: `*`,
      inherited: true,
      declarations: [{ name: "cursor", value: "default" }],
    },
  ]);
});
