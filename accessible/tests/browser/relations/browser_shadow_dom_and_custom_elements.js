/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test relation defaults via element internals
 */
addAccessibleTask(
  `
  <div id="dependant1">label</div>
  <custom-checkbox id="host"></custom-checkbox>
  <div id="dependant2">label2</div>

<script>
customElements.define("custom-checkbox",
  class extends HTMLElement {
    constructor() {
      super();
      this.tabIndex = "0";
      this._internals = this.attachInternals();
      this._internals.role = "checkbox";
      this._internals.ariaChecked = "true";
    }
    get internals() {
      return this._internals;
    }
  }
);
</script>`,
  async function (browser, accDoc) {
    let host = findAccessibleChildByID(accDoc, "host");
    let dependant1 = findAccessibleChildByID(accDoc, "dependant1");
    let dependant2 = findAccessibleChildByID(accDoc, "dependant2");

    function invokeSetInternals(reflectionAttrName, targetIds) {
      if (targetIds) {
        Logger.log(
          `Setting internals reflected ${reflectionAttrName} attribute to ${targetIds} for host`
        );
      } else {
        Logger.log(
          `Removing internals reflected ${reflectionAttrName} attribute from node with host`
        );
      }

      return invokeContentTask(
        browser,
        [reflectionAttrName, targetIds],
        (contentAttr, contentTargetIds) => {
          let internals = content.document.getElementById("host").internals;
          if (contentTargetIds) {
            internals[contentAttr] = contentTargetIds.map(targetId =>
              content.document.getElementById(targetId)
            );
          } else {
            internals[contentAttr] = null;
          }
        }
      );
    }

    async function testInternalsRelation(
      attrName,
      reflectionAttrName,
      hostRelation,
      dependantRelation
    ) {
      info(`setting default ${reflectionAttrName}`);
      await invokeSetInternals(reflectionAttrName, ["dependant1"]);
      await testCachedRelation(host, hostRelation, [dependant1]);
      await testCachedRelation(dependant1, dependantRelation, [host]);
      await testCachedRelation(dependant2, dependantRelation, []);

      info(`setting override ${attrName}`);
      await invokeSetAttribute(browser, "host", attrName, "dependant2");
      await testCachedRelation(host, hostRelation, [dependant2]);
      await testCachedRelation(dependant2, dependantRelation, [host]);
      await testCachedRelation(dependant1, dependantRelation, []);

      info(`unsetting default ${reflectionAttrName} and ${attrName} override`);
      await invokeSetInternals(reflectionAttrName, null);
      await invokeSetAttribute(browser, "host", attrName, null);
      await testCachedRelation(host, hostRelation, []);
      await testCachedRelation(dependant2, dependantRelation, []);
      await testCachedRelation(dependant1, dependantRelation, []);
    }

    await testInternalsRelation(
      "aria-labelledby",
      "ariaLabelledByElements",
      RELATION_LABELLED_BY,
      RELATION_LABEL_FOR
    );
    await testInternalsRelation(
      "aria-describedby",
      "ariaDescribedByElements",
      RELATION_DESCRIBED_BY,
      RELATION_DESCRIPTION_FOR
    );
    await testInternalsRelation(
      "aria-controls",
      "ariaControlsElements",
      RELATION_CONTROLLER_FOR,
      RELATION_CONTROLLED_BY
    );
    await testInternalsRelation(
      "aria-flowto",
      "ariaFlowToElements",
      RELATION_FLOWS_TO,
      RELATION_FLOWS_FROM
    );
    await testInternalsRelation(
      "aria-details",
      "ariaDetailsElements",
      RELATION_DETAILS,
      RELATION_DETAILS_FOR
    );
    await testInternalsRelation(
      "aria-errormessage",
      "ariaErrorMessageElements",
      RELATION_ERRORMSG,
      RELATION_ERRORMSG_FOR
    );
  }
);

/**
 * Moving explicitly set elements across shadow DOM boundaries.
 */
addAccessibleTask(
  `
  <div id="describedButtonContainer">
    <div id="buttonDescription1">Delicious</div>
    <div id="buttonDescription2">Nutritious</div>
    <div id="outerShadowHost"></div>
    <button id="describedElement">Button</button>
  </div>

<script>
    const buttonDescription1 = document.getElementById("buttonDescription1");
    const buttonDescription2 = document.getElementById("buttonDescription2");
    const outerShadowRoot = outerShadowHost.attachShadow({mode: "open"});
    const innerShadowHost = document.createElement("div");
    outerShadowRoot.appendChild(innerShadowHost);
    const innerShadowRoot = innerShadowHost.attachShadow({mode: "open"});

    const describedElement = document.getElementById("describedElement");
    // Add some attr associated light DOM elements.
    describedElement.ariaDescribedByElements = [buttonDescription1, buttonDescription2];
</script>`,
  async function (browser, accDoc) {
    const waitAndReturnRecreated = acc => {
      const id = getAccessibleDOMNodeID(acc);
      return waitForEvents([
        [EVENT_HIDE, acc],
        [EVENT_SHOW, id],
      ]).then(evts => evts[1].accessible);
    };

    let describedAcc = findAccessibleChildByID(accDoc, "describedElement");
    let accDescription1 = findAccessibleChildByID(accDoc, "buttonDescription1");
    let accDescription2 = findAccessibleChildByID(accDoc, "buttonDescription2");

    // All elements were in the same scope, so relations are intact.
    await testCachedRelation(describedAcc, RELATION_DESCRIBED_BY, [
      accDescription1,
      accDescription2,
    ]);
    await testCachedRelation(accDescription1, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);
    await testCachedRelation(accDescription2, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);

    let onRecreated = waitAndReturnRecreated(describedAcc);
    await invokeContentTask(browser, [], () => {
      const outerShadowRoot =
        content.document.getElementById("outerShadowHost").shadowRoot;
      const describedElement =
        content.document.getElementById("describedElement");
      outerShadowRoot.appendChild(describedElement);
    });

    info("Waiting for described accessible to be recreated");
    describedAcc = await onRecreated;
    // Relations should still be intact, we are referencing elements in a lighter scope.
    await testCachedRelation(describedAcc, RELATION_DESCRIBED_BY, [
      accDescription1,
      accDescription2,
    ]);
    await testCachedRelation(accDescription1, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);
    await testCachedRelation(accDescription2, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);

    // Move the explicitly set elements into a deeper shadow DOM.
    onRecreated = Promise.all([
      waitAndReturnRecreated(accDescription1),
      waitAndReturnRecreated(accDescription2),
    ]);
    await invokeContentTask(browser, [], () => {
      const buttonDescription1 =
        content.document.getElementById("buttonDescription1");
      const buttonDescription2 =
        content.document.getElementById("buttonDescription2");
      const innerShadowRoot =
        content.document.getElementById("outerShadowHost").shadowRoot
          .firstElementChild.shadowRoot;
      innerShadowRoot.appendChild(buttonDescription1);
      innerShadowRoot.appendChild(buttonDescription2);
    });

    [accDescription1, accDescription2] = await onRecreated;

    // Relation is severed, because relation dependants are no longer in a valid scope.
    await testCachedRelation(describedAcc, RELATION_DESCRIBED_BY, []);
    await testCachedRelation(accDescription1, RELATION_DESCRIPTION_FOR, []);
    await testCachedRelation(accDescription2, RELATION_DESCRIPTION_FOR, []);

    // Move into the same shadow scope as the explicitly set elements.
    onRecreated = waitAndReturnRecreated(describedAcc);
    await invokeContentTask(browser, [], () => {
      const outerShadowRoot =
        content.document.getElementById("outerShadowHost").shadowRoot;
      const describedElement =
        outerShadowRoot.getElementById("describedElement");
      const innerShadowRoot = outerShadowRoot.firstElementChild.shadowRoot;
      innerShadowRoot.appendChild(describedElement);
    });

    describedAcc = await onRecreated;
    // Relation is restored, because target is now in same shadow scope.
    await testCachedRelation(describedAcc, RELATION_DESCRIBED_BY, [
      accDescription1,
      accDescription2,
    ]);
    await testCachedRelation(accDescription1, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);
    await testCachedRelation(accDescription2, RELATION_DESCRIPTION_FOR, [
      describedAcc,
    ]);
  }
);
