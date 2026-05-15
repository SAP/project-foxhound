/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test details relations for the popovertarget content attribute.
 */
addAccessibleTask(
  `
<button id="hide" popovertarget="popover" popovertargetaction="hide">hide</button>
<button id="toggle1" popovertarget="popover">toggle1</button>
<button id="toggle2">toggle2</button>
<button id="toggleSibling">toggleSibling</button>
<div id="popover" popover>popover</div>
<div id="details">details</div>
  `,
  async function testPopoverContent(browser, docAcc) {
    // The popover is hidden, so nothing should be referring to it.
    const hide = findAccessibleChildByID(docAcc, "hide");
    await testCachedRelation(hide, RELATION_DETAILS, []);
    const toggle1 = findAccessibleChildByID(docAcc, "toggle1");
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
    const toggle2 = findAccessibleChildByID(docAcc, "toggle2");
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    const toggleSibling = findAccessibleChildByID(docAcc, "toggleSibling");
    await testCachedRelation(toggleSibling, RELATION_DETAILS, []);

    info("Showing popover");
    let shown = waitForEvent(EVENT_SHOW, "popover");
    toggle1.doAction(0);
    const popover = (await shown).accessible;
    await testCachedRelation(toggle1, RELATION_DETAILS, popover);
    // toggle2 shouldn't have a details relation because it doesn't have a
    // popovertarget.
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    // hide shouldn't have a details relation because its action is hide.
    await testCachedRelation(hide, RELATION_DETAILS, []);
    // toggleSibling shouldn't have a details relation because it is a sibling
    // of the popover.
    await testCachedRelation(toggleSibling, RELATION_DETAILS, []);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, toggle1);

    is(
      toggle1.attributes.getStringProperty("details-from"),
      "popover-target",
      "Correct details-from attribute"
    );

    info("Setting toggle2 popovertarget");
    await invokeSetAttribute(browser, "toggle2", "popovertarget", "popover");
    await testCachedRelation(toggle2, RELATION_DETAILS, popover);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, [toggle1, toggle2]);

    info("Removing toggle2 popovertarget");
    await invokeSetAttribute(browser, "toggle2", "popovertarget", null);
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, toggle1);

    info("Setting aria-details on toggle1");
    await invokeSetAttribute(browser, "toggle1", "aria-details", "details");
    const details = findAccessibleChildByID(docAcc, "details");
    // aria-details overrides popover.
    await testCachedRelation(toggle1, RELATION_DETAILS, details);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, []);

    info("Removing aria-details from toggle1");
    await invokeSetAttribute(browser, "toggle1", "aria-details", null);
    await testCachedRelation(toggle1, RELATION_DETAILS, popover);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, toggle1);

    info("Hiding popover");
    let hidden = waitForEvent(EVENT_HIDE, popover);
    toggle1.doAction(0);
    // The relations between toggle1 and popover are removed when popover shuts
    // down. However, this doesn't cause a cache update notification. Therefore,
    // to avoid timing out in testCachedRelation, we must wait for a hide event
    // first.
    await hidden;
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
  },
  { chrome: false, topLevel: true }
);

/**
 * Test details relations for the commandfor content attribute.
 */
addAccessibleTask(
  `
<button id="hide" commandfor="popover" command="hide-popover">hide</button>
<button id="toggle1" commandfor="popover" command="toggle-popover">toggle1</button>
<button id="show" commandfor="popover" command="show-popover">show</button>
<button id="showModal" commandfor="popover" command="show-modal">show-modal</button>
<button id="invalid" commandfor="popover" command="invalid">invalid</button>
<button id="custom" commandfor="popover" command="--custom">custom</button>
<button id="toggle2" command="toggle-popover">toggle2</button>
<button id="toggleSibling" commandfor="popover" command="toggle-popover">toggleSibling</button>
<dialog id="popover" popover>popover</dialog>
<div id="details">details</div>
  `,
  async function testPopoverContent(browser, docAcc) {
    // The popover is hidden, so nothing should be referring to it.
    const hide = findAccessibleChildByID(docAcc, "hide");
    await testCachedRelation(hide, RELATION_DETAILS, []);
    const toggle1 = findAccessibleChildByID(docAcc, "toggle1");
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
    const show = findAccessibleChildByID(docAcc, "show");
    await testCachedRelation(show, RELATION_DETAILS, []);
    const toggle2 = findAccessibleChildByID(docAcc, "toggle2");
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    const showModal = findAccessibleChildByID(docAcc, "showModal");
    await testCachedRelation(showModal, RELATION_DETAILS, []);
    const invalid = findAccessibleChildByID(docAcc, "invalid");
    await testCachedRelation(invalid, RELATION_DETAILS, []);
    const custom = findAccessibleChildByID(docAcc, "custom");
    await testCachedRelation(custom, RELATION_DETAILS, []);
    const toggleSibling = findAccessibleChildByID(docAcc, "toggleSibling");
    await testCachedRelation(toggleSibling, RELATION_DETAILS, []);

    info("Showing popover");
    let shown = waitForEvent(EVENT_SHOW, "popover");
    toggle1.doAction(0);
    const popover = (await shown).accessible;
    await testCachedRelation(toggle1, RELATION_DETAILS, popover);
    await testCachedRelation(show, RELATION_DETAILS, popover);
    // toggle2 shouldn't have a details relation because it doesn't have a
    // commandfor.
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    // hide shouldn't have a details relation because its action is hide-popover.
    await testCachedRelation(hide, RELATION_DETAILS, []);
    // showModal shouldn't have a details relation because it is executing a
    // non-popover command.
    await testCachedRelation(showModal, RELATION_DETAILS, []);
    // invalid shouldn't have a details relation because it has an invalid command.
    await testCachedRelation(invalid, RELATION_DETAILS, []);
    // custom shouldn't have a details relation because it has a custom command.
    await testCachedRelation(invalid, RELATION_DETAILS, []);
    // toggleSibling shouldn't have a details relation because it is a sibling
    // of the popover.
    await testCachedRelation(toggleSibling, RELATION_DETAILS, []);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, [toggle1, show]);
    is(
      toggle1.attributes.getStringProperty("details-from"),
      "command-for",
      "Correct details-from attribute"
    );

    info("Setting toggle2 commandfor");
    await invokeSetAttribute(browser, "toggle2", "commandfor", "popover");
    await testCachedRelation(toggle2, RELATION_DETAILS, popover);

    await testCachedRelation(popover, RELATION_DETAILS_FOR, [
      toggle1,
      show,
      toggle2,
    ]);

    info("Removing toggle2 commandfor");
    await invokeSetAttribute(browser, "toggle2", "commandfor", null);
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, [toggle1, show]);

    info("Setting aria-details on toggle1");
    await invokeSetAttribute(browser, "toggle1", "aria-details", "details");
    const details = findAccessibleChildByID(docAcc, "details");
    // aria-details overrides popover.
    await testCachedRelation(toggle1, RELATION_DETAILS, details);
    is(
      toggle1.attributes.getStringProperty("details-from"),
      "aria-details",
      "Correct details-from attribute"
    );

    await testCachedRelation(popover, RELATION_DETAILS_FOR, [show]);

    info("Removing aria-details from toggle1");
    await invokeSetAttribute(browser, "toggle1", "aria-details", null);
    await testCachedRelation(toggle1, RELATION_DETAILS, popover);
    await testCachedRelation(popover, RELATION_DETAILS_FOR, [toggle1, show]);

    is(
      toggle1.attributes.getStringProperty("details-from"),
      "command-for",
      "Correct details-from attribute"
    );

    info("Hiding popover");
    let hidden = waitForEvent(EVENT_HIDE, popover);
    toggle1.doAction(0);
    // The relations between toggle1 and popover are removed when popover shuts
    // down. However, this doesn't cause a cache update notification. Therefore,
    // to avoid timing out in testCachedRelation, we must wait for a hide event
    // first.
    await hidden;
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
    await testCachedRelation(show, RELATION_DETAILS, []);
  },
  { chrome: false, topLevel: true }
);

/**
 * Test details relations for the popoverTargetElement WebIDL attribute.
 */
addAccessibleTask(
  `
<button id="toggle1">toggle1</button>
<button id="toggle2">toggle2</button>
between
<div id="popover1" popover>popover1</div>
<button id="toggle3">toggle3</button>
<div id="shadowHost"><template shadowrootmode="open">
  <button id="toggle4">toggle4</button>
  between
  <div id="popover2" popover>popover2</div>
  <button id="toggle5">toggle5</button>
</template></div>
  `,
  async function testPopoverIdl(browser, docAcc) {
    // No popover is showing, so there shouldn't be any details relations.
    const toggle1 = findAccessibleChildByID(docAcc, "toggle1");
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
    const toggle2 = findAccessibleChildByID(docAcc, "toggle2");
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    const toggle3 = findAccessibleChildByID(docAcc, "toggle3");
    await testCachedRelation(toggle3, RELATION_DETAILS, []);
    const toggle4 = findAccessibleChildByID(docAcc, "toggle4");
    await testCachedRelation(toggle4, RELATION_DETAILS, []);
    const toggle5 = findAccessibleChildByID(docAcc, "toggle5");
    await testCachedRelation(toggle5, RELATION_DETAILS, []);

    info("Showing popover1");
    let shown = waitForEvent(EVENT_SHOW, "popover1");
    toggle1.doAction(0);
    const popover1 = (await shown).accessible;
    await testCachedRelation(toggle1, RELATION_DETAILS, popover1);
    // toggle5 is inside the shadow DOM and popover1 is outside, so the target
    // is valid.
    await testCachedRelation(toggle5, RELATION_DETAILS, popover1);
    await testCachedRelation(popover1, RELATION_DETAILS_FOR, [
      toggle1,
      toggle5,
    ]);
    info("Setting toggle2's popover target to popover1");
    await invokeContentTask(browser, [], () => {
      const toggle2Dom = content.document.getElementById("toggle2");
      const popover1Dom = content.document.getElementById("popover1");
      toggle2Dom.popoverTargetElement = popover1Dom;
    });
    await testCachedRelation(toggle2, RELATION_DETAILS, popover1);
    await testCachedRelation(popover1, RELATION_DETAILS_FOR, [
      toggle1,
      toggle2,
      toggle5,
    ]);
    info("Clearing toggle2's popover target");
    await invokeContentTask(browser, [], () => {
      const toggle2Dom = content.document.getElementById("toggle2");
      toggle2Dom.popoverTargetElement = null;
    });
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    await testCachedRelation(popover1, RELATION_DETAILS_FOR, [
      toggle1,
      toggle5,
    ]);
    info("Hiding popover1");
    let hidden = waitForEvent(EVENT_HIDE, popover1);
    toggle1.doAction(0);
    await hidden;
    await testCachedRelation(toggle1, RELATION_DETAILS, []);
    await testCachedRelation(toggle2, RELATION_DETAILS, []);
    await testCachedRelation(toggle5, RELATION_DETAILS, []);

    info("Showing popover2");
    shown = waitForEvent(EVENT_SHOW, "popover2");
    toggle4.doAction(0);
    const popover2 = (await shown).accessible;
    // toggle4 is in the same shadow DOM as popover2.
    await testCachedRelation(toggle4, RELATION_DETAILS, popover2);
    // toggle3 is outside popover2's shadow DOM, so the target isn't valid.
    await testCachedRelation(toggle3, RELATION_DETAILS, []);
    await testCachedRelation(popover2, RELATION_DETAILS_FOR, [toggle4]);
    info("Hiding popover2");
    hidden = waitForEvent(EVENT_HIDE, popover2);
    toggle4.doAction(0);
    await hidden;
    await testCachedRelation(toggle4, RELATION_DETAILS, []);
  },
  {
    chrome: true,
    topLevel: true,
    contentSetup: async function contentSetup() {
      const toggle1 = content.document.getElementById("toggle1");
      const popover1 = content.document.getElementById("popover1");
      toggle1.popoverTargetElement = popover1;
      const toggle3 = content.document.getElementById("toggle3");
      const shadow = content.document.getElementById("shadowHost").shadowRoot;
      const toggle4 = shadow.getElementById("toggle4");
      const popover2 = shadow.getElementById("popover2");
      toggle3.popoverTargetElement = popover2;
      toggle4.popoverTargetElement = popover2;
      const toggle5 = shadow.getElementById("toggle5");
      toggle5.popoverTargetElement = popover1;
    },
  }
);
