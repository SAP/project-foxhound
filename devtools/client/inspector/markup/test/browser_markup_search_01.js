/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that searching for nodes using the selector-search input expands and
// selects the right nodes in the markup-view, even when those nodes are deeply
// nested (and therefore not attached yet when the markup-view is initialized).

const TEST_URL = URL_ROOT + "doc_markup_search.html";
const DEVTOOLS_SEARCH_HIGHLIGHT_NAME = "devtools-search";

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URL);

  let container = await getContainerForSelector("em", inspector, true);
  ok(!container, "The <em> tag isn't present yet in the markup-view");

  // Searching for the innermost element first makes sure that the inspector
  // back-end is able to attach the resulting node to the tree it knows at the
  // moment. When the inspector is started, the <body> is the default selected
  // node, and only the parents up to the ROOT are known, and its direct
  // children.
  info("searching for the innermost child: <em>");
  await searchInMarkupView(inspector, "em");

  container = await getContainerForSelector("em", inspector);
  ok(container, "The <em> tag is now imported in the markup-view");

  let nodeFront = await getNodeFront("em", inspector);
  is(
    inspector.selection.nodeFront,
    nodeFront,
    "The <em> tag is the currently selected node"
  );
  ok(
    inspector.markup.win.CSS.highlights.has(DEVTOOLS_SEARCH_HIGHLIGHT_NAME),
    `"${DEVTOOLS_SEARCH_HIGHLIGHT_NAME}" CSS highlight does exist`
  );

  checkHighlightedSearchResults(inspector, [
    // Opening tag
    "em",
    // Closing tag
    "em",
  ]);

  info("searching for other nodes too");
  for (const node of ["span", "li", "ul"]) {
    await searchInMarkupView(inspector, node);

    nodeFront = await getNodeFront(node, inspector);
    is(
      inspector.selection.nodeFront,
      nodeFront,
      "The <" + node + "> tag is the currently selected node"
    );
    // We still get 2 Ranges on those items: even if only the opening tag is visible (because
    // the elements are expanded to show their children), a closing tag is actually
    // rendered and hidden in CSS.
    checkHighlightedSearchResults(inspector, [node, node]);
  }

  await searchInMarkupView(inspector, "BUTT");
  is(
    inspector.selection.nodeFront,
    await getNodeFront(".Buttons", inspector),
    "The section.Buttons element is selected"
  );
  // Selected node markup: <section class="Buttons">
  checkHighlightedSearchResults(inspector, ["Butt"]);

  await searchInMarkupView(inspector, "BUT");
  is(
    inspector.selection.nodeFront,
    await getNodeFront(".Buttons", inspector),
    "The section.Buttons element is selected"
  );
  checkHighlightedSearchResults(inspector, ["But"]);

  let onSearchResult = inspector.search.once("search-result");
  inspector.searchNextButton.click();
  info("Waiting for results");
  await onSearchResult;

  is(
    inspector.selection.nodeFront,
    await getNodeFront(`button[type="button"]`, inspector),
    `The button[type="button"] element is selected`
  );
  // Selected node markup: <button type="button" class="Button">OK</button>
  checkHighlightedSearchResults(inspector, [
    // opening tag (`<button`)
    "but",
    // class attribute (`class="Button"`)
    // Attributes are re-ordered in the markup view, that's wy this is coming before
    // the result for the type attribute.
    "But",
    // type attribute (`type="button"`)
    "but",
    // closing tag (`</button`)
    "but",
  ]);

  onSearchResult = inspector.search.once("search-result");
  inspector.searchNextButton.click();
  info("Waiting for results");
  await onSearchResult;

  is(
    inspector.selection.nodeFront,
    await getNodeFront(`section.Buttons > p`, inspector),
    `The p element is selected`
  );
  // Selected node markup: <p>Click the button</p>
  checkHighlightedSearchResults(inspector, ["but"]);

  const onSearchCleared = inspector.once("search-cleared");
  inspector.searchClearButton.click();
  info("Waiting for search to clear");
  await onSearchCleared;

  checkHighlightedSearchResults(inspector, []);

  await searchInMarkupView(inspector, "TALLTOPMATCH");
  const talltopNodeFront = await getNodeFront("section.talltop", inspector);
  const talltopNodeFrontChildren =
    await inspector.walker.children(talltopNodeFront);
  is(
    inspector.selection.nodeFront,
    talltopNodeFrontChildren.nodes[0],
    `The section.talltop text node is selected`
  );
  checkHighlightedSearchResults(inspector, ["TALLTOPMATCH"]);

  await searchInMarkupView(inspector, "TALLBOTTOMMATCH");
  const tallbottomNodeFront = await getNodeFront(
    "section.tallbottom",
    inspector
  );
  const tallbottomNodeFrontChildren =
    await inspector.walker.children(tallbottomNodeFront);
  is(
    inspector.selection.nodeFront,
    tallbottomNodeFrontChildren.nodes[0],
    `The section.tallbottom text node is selected`
  );
  checkHighlightedSearchResults(inspector, ["TALLBOTTOMMATCH"]);

  await searchInMarkupView(inspector, "OVERFLOWSMATCH");
  const overflowsNodeFront = await getNodeFront("section.overflows", inspector);
  const overflowsNodeFrontChildren =
    await inspector.walker.children(overflowsNodeFront);
  is(
    inspector.selection.nodeFront,
    overflowsNodeFrontChildren.nodes[0],
    "The section.overflows text node is selected"
  );
  checkHighlightedSearchResults(inspector, ["OVERFLOWSMATCH"]);

  info(
    "Check that matching node with non-visible search result are still being scrolled to"
  );
  // Scroll to top to make sure the node isn't in view at first
  const markupViewContainer = inspector.markup.win.document.documentElement;
  markupViewContainer.scrollTop = 0;
  markupViewContainer.scrollLeft = 0;

  const croppedAttributeContainer = await getContainerForSelector(
    "section#cropped-attribute",
    inspector
  );
  let croppedAttributeContainerRect =
    croppedAttributeContainer.elt.getBoundingClientRect();

  ok(
    croppedAttributeContainerRect.y < 0 ||
      croppedAttributeContainerRect.y > markupViewContainer.clientHeight,
    "section#cropped-attribute container is not into view before searching for a match in its attributes"
  );

  await searchInMarkupView(inspector, "croppedvalue");
  is(
    inspector.selection.nodeFront,
    await getNodeFront("section#cropped-attribute", inspector),
    "The section#cropped-attribute element is selected"
  );
  checkHighlightedSearchResults(inspector, []);
  // Check that node visible after it was selected
  croppedAttributeContainerRect =
    croppedAttributeContainer.elt.getBoundingClientRect();

  Assert.greaterOrEqual(
    croppedAttributeContainerRect.y,
    0,
    `Node with cropped attributes is not above visible viewport`
  );
  Assert.less(
    croppedAttributeContainerRect.y,
    markupViewContainer.clientHeight,
    `Node with cropped attributes is not below visible viewport`
  );

  // Sanity check to make sure the markup view does overflow in both axes. We need to
  // wait after the search is done as their text node is only revealed when cycling through
  // search results.
  Assert.greater(
    markupViewContainer.scrollHeight,
    markupViewContainer.clientHeight,
    "Markup view overflows vertically"
  );
  Assert.greater(
    markupViewContainer.scrollWidth,
    markupViewContainer.clientWidth,
    "Markup view overflows horizontally"
  );

  info("Search for pseudo elements");

  await searchInMarkupView(inspector, "::before");
  is(
    inspector.selection.nodeFront.displayName,
    "::before",
    "The ::before element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::before"]);

  await searchInMarkupView(inspector, "::after");
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "The ::after element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::after"]);

  await searchInMarkupView(inspector, "::marker");
  is(
    inspector.selection.nodeFront.displayName,
    "::marker",
    "The ::marker element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::marker"]);

  await searchInMarkupView(inspector, "::backdrop");
  is(
    inspector.selection.nodeFront.displayName,
    "::backdrop",
    "The ::backdrop element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::backdrop"]);

  // Search by the `content` declaration of the ::before and ::after pseudo elements
  await searchInMarkupView(inspector, "my_before_text");
  is(
    inspector.selection.nodeFront.displayName,
    "::before",
    "The ::before element is selected"
  );
  // no highlighting as the `content` text isn't displayed in the markup view
  checkHighlightedSearchResults(inspector, []);

  await searchInMarkupView(inspector, "my_after_text");
  is(
    inspector.selection.nodeFront.displayName,
    "::after",
    "The ::after element is selected"
  );
  // no highlighting as the `content` text isn't displayed in the markup view
  checkHighlightedSearchResults(inspector, []);

  info("Search for view-transition pseudo elements");
  // Trigger the view transition
  const onMarkupMutation = inspector.once("markupmutation");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    const document = content.document;
    content.testTransition = document.startViewTransition(() => {
      document.querySelector(".pseudos").replaceChildren("updated");
    });
    await content.testTransition.ready;
    await content.testTransition.updateCallbackDone;
  });
  await onMarkupMutation;

  await searchInMarkupView(inspector, "::view-transition");
  is(
    inspector.selection.nodeFront.displayName,
    "::view-transition",
    "The ::view-transition element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::view-transition"]);

  await searchInMarkupView(inspector, "::view-transition-old(root)");
  is(
    inspector.selection.nodeFront.displayName,
    "::view-transition-old(root)",
    "The ::view-transition-old(root) element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::view-transition-old(root)"]);

  await searchInMarkupView(inspector, "::view-transition-new(custom)");
  is(
    inspector.selection.nodeFront.displayName,
    "::view-transition-new(custom)",
    "The ::view-transition-new(custom) element is selected"
  );
  checkHighlightedSearchResults(inspector, ["::view-transition-new(custom)"]);

  // Cancel transition
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.testTransition.skipTransition();
    delete content.testTransition;
  });

  await searchInMarkupView(inspector, "flex");
  is(
    inspector.selection.nodeFront,
    await getNodeFront(".Buttons", inspector),
    "The section.Buttons element is selected"
  );
  // Selected node markup: <section class="Buttons">
  checkHighlightedSearchResults(inspector, ["flex"]);
});

function checkHighlightedSearchResults(inspector, expectedHighlights) {
  const searchInputValue = getMarkupViewSearchInput(inspector).value;

  info(`Checking highlights for "${searchInputValue}" search`);
  const devtoolsHighlights = [
    ...inspector.markup.win.CSS.highlights
      .get(DEVTOOLS_SEARCH_HIGHLIGHT_NAME)
      .values(),
  ];
  Assert.deepEqual(
    devtoolsHighlights.map(range => range.toString()),
    expectedHighlights,
    `Got expected highlights for "${searchInputValue}"`
  );

  if (expectedHighlights.length) {
    const markupViewContainer = inspector.markup.win.document.documentElement;
    info(
      `Check that we scrolled so the first highlighted range for "${searchInputValue}" is visible`
    );
    const [rect] = devtoolsHighlights[0].getClientRects();
    const { x, y } = rect;

    Assert.greaterOrEqual(
      y,
      0,
      `First "${searchInputValue}" match not above visible viewport`
    );
    Assert.less(
      y,
      markupViewContainer.clientHeight,
      `First "${searchInputValue}" match not below visible viewport`
    );
    Assert.greaterOrEqual(
      x,
      0,
      `First "${searchInputValue}" match not before the "left border" of the visible viewport`
    );
    Assert.less(
      x,
      markupViewContainer.clientWidth,
      `First "${searchInputValue}" match not after the "right border" of the visible viewport`
    );
  }
}
