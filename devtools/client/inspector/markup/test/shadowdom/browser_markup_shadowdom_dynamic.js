/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the inspector is correctly updated when shadow roots are attached to
// components after displaying them in the markup view.

const TEST_URL =
  `data:text/html;charset=utf-8,` +
  encodeURIComponent(`
  <div id="root">
    <test-component>
      <div slot="slot1" id="el1">slot1-1</div>
      <div slot="slot1" id="el2">slot1-2</div>
    </test-component>
    <inline-component>inline text</inline-component>
  </div>

  <script>
    'use strict';
    window.attachTestComponent = function () {
      customElements.define('test-component', class extends HTMLElement {
        constructor() {
          super();
          let shadowRoot = this.attachShadow({mode: 'open'});
          shadowRoot.innerHTML = \`<div id="slot1-container">
                                     <slot name="slot1"></slot>
                                   </div>
                                   <other-component>
                                     <div slot="slot2">slot2-1</div>
                                   </other-component>\`;
        }
      });
    }

    window.attachOtherComponent = function () {
      customElements.define('other-component', class extends HTMLElement {
        constructor() {
          super();
          let shadowRoot = this.attachShadow({mode: 'open'});
          shadowRoot.innerHTML = \`<div id="slot2-container">
                                     <slot name="slot2"></slot>
                                     <div>some-other-node</div>
                                   </div>\`;
        }
      });
    }

    window.attachInlineComponent = function () {
      customElements.define('inline-component', class extends HTMLElement {
        constructor() {
          super();
          let shadowRoot = this.attachShadow({mode: 'open'});
          shadowRoot.innerHTML = \`<div id="inline-component-content">
                                     <div>some-inline-content</div>
                                   </div>\`;
        }
      });
    }
  </script>`);

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URL);

  const tree = `
    div
      test-component
        slot1-1
        slot1-2
      inline text`;
  await assertMarkupViewAsTree(tree, "#root", inspector);

  // numChildren returns 5 here because it includes whitespace text nodes.
  // If a shadow DOM is not attached, NodeActor.numChildren uses rawNode.childNodes.length,
  // which counts all nodes including whitespace. When a shadow DOM is attached,
  // it uses walker.countChildren() which filters out zero-size whitespace text nodes.
  info("Verify test-component has 5 children before attaching shadow DOM");
  const testComponentNodeFront = await getNodeFront(
    "test-component",
    inspector
  );
  is(
    testComponentNodeFront.numChildren,
    5,
    "test-component has 5 children before shadow DOM is attached"
  );

  info("Verify inline-component has 1 child before attaching shadow DOM");
  const inlineComponentNodeFront = await getNodeFront(
    "inline-component",
    inspector
  );
  is(
    inlineComponentNodeFront.numChildren,
    1,
    "inline-component has 1 child before shadow DOM is attached"
  );

  info("Attach a shadow root to test-component");
  let mutated = waitForMutation(inspector, "shadowRootAttached");
  SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    content.wrappedJSObject.attachTestComponent();
  });
  await mutated;

  const treeAfterTestAttach = `
    div
      test-component
        #shadow-root
          slot1-container
            slot
              div!slotted
              div!slotted
          other-component
            slot2-1
        slot1-1
        slot1-2
      inline text`;
  await assertMarkupViewAsTree(treeAfterTestAttach, "#root", inspector);

  info(
    "Check that test-component's numChildren is updated after shadowRootAttached mutation"
  );
  is(
    testComponentNodeFront.numChildren,
    3,
    "test-component has 3 children after shadowRootAttached mutation"
  );

  info("Attach a shadow root to other-component, nested in test-component");
  mutated = waitForMutation(inspector, "shadowRootAttached");
  SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    content.wrappedJSObject.attachOtherComponent();
  });
  await mutated;

  const treeAfterOtherAttach = `
    div
      test-component
        #shadow-root
          slot1-container
            slot
              div!slotted
              div!slotted
          other-component
            #shadow-root
              slot2-container
                slot
                  div!slotted
                some-other-node
            slot2-1
        slot1-1
        slot1-2
      inline text`;
  await assertMarkupViewAsTree(treeAfterOtherAttach, "#root", inspector);

  info(
    "Attach a shadow root to inline-component, check the inline text child."
  );
  mutated = waitForMutation(inspector, "shadowRootAttached");
  SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    content.wrappedJSObject.attachInlineComponent();
  });
  await mutated;

  const treeAfterInlineAttach = `
    div
      test-component
        #shadow-root
          slot1-container
            slot
              div!slotted
              div!slotted
          other-component
            #shadow-root
              slot2-container
                slot
                  div!slotted
                some-other-node
            slot2-1
        slot1-1
        slot1-2
      inline-component
        #shadow-root
          inline-component-content
            some-inline-content
        inline text`;
  await assertMarkupViewAsTree(treeAfterInlineAttach, "#root", inspector);

  info(
    "Check that inline-component's numChildren is updated after shadowRootAttached mutation"
  );
  is(
    inlineComponentNodeFront.numChildren,
    2,
    "inline-component has 2 children after shadowRootAttached mutation"
  );
});
