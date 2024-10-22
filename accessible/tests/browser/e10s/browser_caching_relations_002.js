/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
requestLongerTimeout(2);

/**
 * Test MEMBER_OF relation caching on HTML radio buttons
 */
addAccessibleTask(
  `
  <input type="radio" id="r1">I have no name<br>
  <input type="radio" id="r2">I also have no name<br>
  <input type="radio" id="r3" name="n">I have a name<br>
  <input type="radio" id="r4" name="a">I have a different name<br>
  <fieldset role="radiogroup">
    <input type="radio" id="r5" name="n">I have an already used name
     and am in a different part of the tree
    <input type="radio" id="r6" name="r">I have a different name but am
     in the same group
  </fieldset>`,
  async function (browser, accDoc) {
    const r1 = findAccessibleChildByID(accDoc, "r1");
    const r2 = findAccessibleChildByID(accDoc, "r2");
    const r3 = findAccessibleChildByID(accDoc, "r3");
    const r4 = findAccessibleChildByID(accDoc, "r4");
    const r5 = findAccessibleChildByID(accDoc, "r5");
    const r6 = findAccessibleChildByID(accDoc, "r6");

    await testCachedRelation(r1, RELATION_MEMBER_OF, null);
    await testCachedRelation(r2, RELATION_MEMBER_OF, null);
    await testCachedRelation(r3, RELATION_MEMBER_OF, [r3, r5]);
    await testCachedRelation(r4, RELATION_MEMBER_OF, r4);
    await testCachedRelation(r5, RELATION_MEMBER_OF, [r3, r5]);
    await testCachedRelation(r6, RELATION_MEMBER_OF, r6);

    await invokeContentTask(browser, [], () => {
      content.document.getElementById("r5").name = "a";
    });

    await testCachedRelation(r3, RELATION_MEMBER_OF, r3);
    await testCachedRelation(r4, RELATION_MEMBER_OF, [r5, r4]);
    await testCachedRelation(r5, RELATION_MEMBER_OF, [r5, r4]);
  },
  { chrome: true, iframe: true, remoteIframe: true }
);

/*
 * Test MEMBER_OF relation caching on aria radio buttons
 */
addAccessibleTask(
  `
  <div role="radio" id="r1">I have no radio group</div><br>
  <fieldset role="radiogroup" id="fs">
    <div role="radio" id="r2">hello</div><br>
    <div role="radio" id="r3">world</div><br>
  </fieldset>`,
  async function (browser, accDoc) {
    const r1 = findAccessibleChildByID(accDoc, "r1");
    const r2 = findAccessibleChildByID(accDoc, "r2");
    let r3 = findAccessibleChildByID(accDoc, "r3");

    await testCachedRelation(r1, RELATION_MEMBER_OF, null);
    await testCachedRelation(r2, RELATION_MEMBER_OF, [r2, r3]);
    await testCachedRelation(r3, RELATION_MEMBER_OF, [r2, r3]);
    const r = waitForEvent(EVENT_INNER_REORDER, "fs");
    await invokeContentTask(browser, [], () => {
      let innerRadio = content.document.getElementById("r3");
      content.document.body.appendChild(innerRadio);
    });
    await r;

    r3 = findAccessibleChildByID(accDoc, "r3");
    await testCachedRelation(r1, RELATION_MEMBER_OF, null);
    await testCachedRelation(r2, RELATION_MEMBER_OF, r2);
    await testCachedRelation(r3, RELATION_MEMBER_OF, null);
  },
  {
    chrome: true,
    iframe: true,
    remoteIframe: true,
  }
);

/*
 * Test mutation of LABEL relations via accessible shutdown.
 */
addAccessibleTask(
  `
  <div id="d"></div>
  <label id="l">
    <select id="s">
  `,
  async function (browser, accDoc) {
    const label = findAccessibleChildByID(accDoc, "l");
    const select = findAccessibleChildByID(accDoc, "s");
    const div = findAccessibleChildByID(accDoc, "d");

    await testCachedRelation(label, RELATION_LABEL_FOR, select);
    await testCachedRelation(select, RELATION_LABELLED_BY, label);
    await testCachedRelation(div, RELATION_LABELLED_BY, null);

    const r = waitForEvent(EVENT_REORDER, "l");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("s").remove();
    });
    await r;
    await invokeContentTask(browser, [], () => {
      const l = content.document.getElementById("l");
      l.htmlFor = "d";
    });
    await testCachedRelation(label, RELATION_LABEL_FOR, div);
    await testCachedRelation(div, RELATION_LABELLED_BY, label);
  },
  {
    chrome: false,
    iframe: true,
    remoteIframe: true,
    topLevel: true,
  }
);

/*
 * Test mutation of LABEL relations via DOM ID reuse.
 */
addAccessibleTask(
  `
  <div id="label">before</div><input id="input" aria-labelledby="label">
  `,
  async function (browser, accDoc) {
    let label = findAccessibleChildByID(accDoc, "label");
    const input = findAccessibleChildByID(accDoc, "input");

    await testCachedRelation(label, RELATION_LABEL_FOR, input);
    await testCachedRelation(input, RELATION_LABELLED_BY, label);

    const r = waitForEvent(EVENT_REORDER, accDoc);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("label").remove();
      let l = content.document.createElement("div");
      l.id = "label";
      l.textContent = "after";
      content.document.body.insertBefore(
        l,
        content.document.getElementById("input")
      );
    });
    await r;
    label = findAccessibleChildByID(accDoc, "label");
    await testCachedRelation(label, RELATION_LABEL_FOR, input);
    await testCachedRelation(input, RELATION_LABELLED_BY, label);
  },
  {
    chrome: true,
    iframe: true,
    remoteIframe: true,
  }
);

/*
 * Test LINKS_TO relation caching an anchor with multiple hashes
 */
addAccessibleTask(
  `
  <a id="link" href="#foo#bar">Origin</a><br>
  <a id="anchor" name="foo#bar">Destination`,
  async function (browser, accDoc) {
    const link = findAccessibleChildByID(accDoc, "link");
    const anchor = findAccessibleChildByID(accDoc, "anchor");

    await testCachedRelation(link, RELATION_LINKS_TO, anchor);
  },
  {
    chrome: true,
    // IA2 doesn't have a LINKS_TO relation and Windows non-cached
    // RemoteAccessible uses IA2, so we can't run these tests in this case.
    topLevel: true,
    iframe: true,
    remoteIframe: true,
  }
);

/*
 * Test mutation of LABEL relations via accessible shutdown.
 */
addAccessibleTask(
  `
  <div id="d"></div>
  <label id="l">
    <select id="s">
  `,
  async function (browser, accDoc) {
    const label = findAccessibleChildByID(accDoc, "l");
    const select = findAccessibleChildByID(accDoc, "s");
    const div = findAccessibleChildByID(accDoc, "d");

    await testCachedRelation(label, RELATION_LABEL_FOR, select);
    await testCachedRelation(select, RELATION_LABELLED_BY, label);
    await testCachedRelation(div, RELATION_LABELLED_BY, null);
    await untilCacheOk(() => {
      try {
        // We should get an acc ID back from this, but we don't have a way of
        // verifying its correctness -- it should be the ID of the select.
        return label.cache.getStringProperty("for");
      } catch (e) {
        ok(false, "Exception thrown while trying to read from the cache");
        return false;
      }
    }, "Label for relation exists");

    const r = waitForEvent(EVENT_REORDER, "l");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("s").remove();
    });
    await r;
    await untilCacheOk(() => {
      try {
        label.cache.getStringProperty("for");
      } catch (e) {
        // This property should no longer exist in the cache, so we should
        // get an exception if we try to fetch it.
        return true;
      }
      return false;
    }, "Label for relation exists");

    await invokeContentTask(browser, [], () => {
      const l = content.document.getElementById("l");
      l.htmlFor = "d";
    });
    await testCachedRelation(label, RELATION_LABEL_FOR, div);
    await testCachedRelation(div, RELATION_LABELLED_BY, label);
  },
  {
    /**
     * This functionality is broken in our LocalAcccessible implementation,
     * so we avoid running this test in chrome or when the cache is off.
     */
    chrome: false,
    iframe: true,
    remoteIframe: true,
    topLevel: true,
  }
);

/**
 * Test label relations on HTML figure/figcaption.
 */
addAccessibleTask(
  `
<figure id="figure1">
  before
  <figcaption id="caption1">caption1</figcaption>
  after
</figure>
<figure id="figure2" aria-labelledby="label">
  <figcaption id="caption2">caption2</figure>
</figure>
<div id="label">label</div>
  `,
  async function (browser, docAcc) {
    const figure1 = findAccessibleChildByID(docAcc, "figure1");
    let caption1 = findAccessibleChildByID(docAcc, "caption1");
    await testCachedRelation(figure1, RELATION_LABELLED_BY, caption1);
    await testCachedRelation(caption1, RELATION_LABEL_FOR, figure1);

    info("Hiding caption1");
    let mutated = waitForEvent(EVENT_HIDE, caption1);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("caption1").hidden = true;
    });
    await mutated;
    await testCachedRelation(figure1, RELATION_LABELLED_BY, null);

    info("Showing caption1");
    mutated = waitForEvent(EVENT_SHOW, "caption1");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("caption1").hidden = false;
    });
    caption1 = (await mutated).accessible;
    await testCachedRelation(figure1, RELATION_LABELLED_BY, caption1);
    await testCachedRelation(caption1, RELATION_LABEL_FOR, figure1);

    const figure2 = findAccessibleChildByID(docAcc, "figure2");
    const caption2 = findAccessibleChildByID(docAcc, "caption2");
    const label = findAccessibleChildByID(docAcc, "label");
    await testCachedRelation(figure2, RELATION_LABELLED_BY, [label, caption2]);
    await testCachedRelation(caption2, RELATION_LABEL_FOR, figure2);
    await testCachedRelation(label, RELATION_LABEL_FOR, figure2);
  },
  { chrome: true, topLevel: true }
);

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
<script>
  const toggle1 = document.getElementById("toggle1");
  const popover1 = document.getElementById("popover1");
  toggle1.popoverTargetElement = popover1;
  const toggle3 = document.getElementById("toggle3");
  const shadow = document.getElementById("shadowHost").shadowRoot;
  const toggle4 = shadow.getElementById("toggle4");
  const popover2 = shadow.getElementById("popover2");
  toggle3.popoverTargetElement = popover2;
  toggle4.popoverTargetElement = popover2;
  const toggle5 = shadow.getElementById("toggle5");
  toggle5.popoverTargetElement = popover1;
</script>
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
  { chrome: true, topLevel: true }
);
