/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the grid item's element rep will display the box model higlighter on hover
// and select the node on click.

const TEST_URI = `
  <style type='text/css'>
    #grid {
      display: grid;
    }
    #pseudo-grid::after {
      content: "hello";
      display: grid;
    }
  </style>
  <script>
    class Custom extends HTMLElement {
        constructor() {
          super();
          const shadow = this.attachShadow({ mode: "open" });
          const wrapper = document.createElement("div");
          wrapper.classList.add("in-shadow");
          wrapper.setAttribute("style", "display: grid");

          const cell1 = document.createElement("span");
          cell1.textContent = "shadow cell1";
          const cell2 = document.createElement("span");
          cell2.textContent = "shadow cell2";

          wrapper.append(cell1, cell2);
          shadow.append(wrapper);
        }
      }
      customElements.define("custom-el", Custom);
  </script>
  <div id="grid">
    <div id="cell1">cell1</div>
    <div id="cell2">cell2</div>
  </div>
  <div id="pseudo-grid"></div>
  <custom-el></custom-el>
`;

add_task(async function () {
  await addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  const { inspector, gridInspector } = await openLayoutView();
  const { document: doc } = gridInspector;
  const { store } = inspector;

  const gridList = doc.querySelector("#grid-list");

  const [elementRep, pseudoRep, inShadowRep] =
    gridList.querySelectorAll(".objectBox");

  info("Testing regular grid container");
  is(
    elementRep.textContent,
    "div#grid",
    "Got expected Rep for the #grid element"
  );
  let nodeFront = await highlightAndSelectNode(inspector, elementRep);
  is(nodeFront.tagName, "DIV", "The highlighted node has the correct tagName.");
  is(nodeFront.id, "grid", "The selected node has the correct id.");
  is(
    nodeFront,
    store.getState().grids[0].nodeFront,
    "The selected node is the one stored on the grid item's state."
  );

  info("Testing pseudo element grid container");
  is(
    pseudoRep.textContent,
    "::after",
    "Got expected Rep for the pseudo element grid container"
  );
  nodeFront = await highlightAndSelectNode(inspector, pseudoRep);
  is(
    nodeFront.displayName,
    "::after",
    "The expected node was highlighted/selected"
  );
  is(
    nodeFront,
    store.getState().grids[1].nodeFront,
    "The selected node is the one stored on the grid item's state."
  );

  info("Testing shadow DOM grid container");
  is(
    inShadowRep.textContent,
    "div.in-shadow",
    "Got expected Rep for the shadow DOM grid container"
  );
  nodeFront = await highlightAndSelectNode(inspector, inShadowRep);
  is(
    nodeFront.className,
    "in-shadow",
    "The expected node was highlighted/selected"
  );
  is(
    nodeFront,
    store.getState().grids[2].nodeFront,
    "The selected node is the one stored on the grid item's state."
  );
});

async function highlightAndSelectNode(inspector, repEl) {
  const { waitForHighlighterTypeShown } = getHighlighterTestHelpers(inspector);

  info(`Scrolling into the view the "${repEl.textContent}" element node rep.`);
  const openInspectorButton = repEl.querySelector(".open-inspector");
  openInspectorButton.scrollIntoView();

  info("Listen to node-highlight event and mouse over the widget");
  let onHighlight = waitForHighlighterTypeShown(
    inspector.highlighters.TYPES.BOXMODEL
  );
  EventUtils.synthesizeMouse(
    openInspectorButton,
    10,
    5,
    { type: "mouseover" },
    openInspectorButton.ownerGlobal
  );
  const { nodeFront } = await onHighlight;

  ok(nodeFront, "nodeFront was returned from highlighting the node.");

  const onSelection = inspector.selection.once("new-node-front");
  // Selecting the node will cause a new highlight
  onHighlight = waitForHighlighterTypeShown(
    inspector.highlighters.TYPES.BOXMODEL
  );
  EventUtils.sendMouseEvent(
    { type: "click" },
    openInspectorButton,
    openInspectorButton.ownerGlobal
  );
  await onSelection;
  await onHighlight;

  is(
    inspector.selection.nodeFront,
    nodeFront,
    "The node is selected in the markup view when clicking the node"
  );

  return nodeFront;
}
