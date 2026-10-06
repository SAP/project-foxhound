/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests adding a rule on elements in shadow DOM

const TEST_URL =
  `data:text/html;charset=utf-8,` +
  encodeURIComponent(`
  <html>
  <body>
    <test-component>
      <div slot="my-slot">a slot</div>
    </test-component>

    <script>
      'use strict';
      customElements.define('test-component', class extends HTMLElement {
        constructor() {
          super();
          let shadowRoot = this.attachShadow({mode: 'open'});
          shadowRoot.innerHTML = '<h1>hello</h1><slot name="my-slot"></slot>';
        }
      });
    </script>
  </body>
  </html>
`);

add_task(async function () {
  await addTab(TEST_URL);
  const { inspector, view } = await openRuleView();
  const { markup } = inspector;

  // <test-component> is a shadow host.
  info("Find and expand the test-component shadow DOM host.");
  const hostFront = await getNodeFront("test-component", inspector);

  await markup.expandNode(hostFront);
  await waitForMultipleChildrenUpdates(inspector);

  info(
    "Test that expanding a shadow host shows shadow root and one host child."
  );
  const hostContainer = markup.getContainer(hostFront);

  info("Expand the shadow root");
  const childContainers = hostContainer.getChildContainers();
  const shadowRootContainer = childContainers[0];
  await expandContainer(inspector, shadowRootContainer);

  const [h1Container, slotContainer] = shadowRootContainer.getChildContainers();

  info("Add a rule on the h1 node in the shadow DOM");
  await selectNode(h1Container.node, inspector);

  // Add the rule
  await addNewRuleAndDismissEditor(inspector, view, "h1", 1);
  // and a property
  await addProperty(view, 1, "color", "red");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "h1",
      declarations: [{ name: "color", value: "red", dirty: true }],
    },
  ]);
  let computedColor = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () =>
      content.getComputedStyle(
        content.document
          .querySelector("test-component")
          .shadowRoot.querySelector("h1")
      ).color
  );
  is(
    computedColor,
    "rgb(255, 0, 0)",
    "The declaration was properly assigned to the shadow DOM h1"
  );

  info("Add a rule on the slot node in the shadow DOM");
  await selectNode(slotContainer.node, inspector);

  // Add the rule
  await addNewRuleAndDismissEditor(inspector, view, "slot", 1);
  // and a property
  await addProperty(view, 1, "color", "blue");

  await checkRuleViewContent(view, [
    {
      selector: "element",
      selectorEditable: false,
      declarations: [],
    },
    {
      selector: "slot",
      declarations: [{ name: "color", value: "blue", dirty: true }],
    },
  ]);
  computedColor = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () =>
      content.getComputedStyle(
        content.document
          .querySelector("test-component")
          .shadowRoot.querySelector("slot")
      ).color
  );
  is(
    computedColor,
    "rgb(0, 0, 255)",
    "The declaration was properly assigned to the shadow DOM h1"
  );

  const shadowRootStyleSheetsCount = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () =>
      content.document.querySelector("test-component").shadowRoot.styleSheets
        .length
  );
  is(
    shadowRootStyleSheetsCount,
    1,
    "Only one stylesheet was created in the shadow root"
  );
});
