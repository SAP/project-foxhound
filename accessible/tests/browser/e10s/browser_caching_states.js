/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";
requestLongerTimeout(2);

/* import-globals-from ../../mochitest/role.js */
/* import-globals-from ../../mochitest/states.js */
loadScripts(
  { name: "role.js", dir: MOCHITESTS_DIR },
  { name: "states.js", dir: MOCHITESTS_DIR }
);

/**
 * Test data has the format of:
 * {
 *   desc      {String}   description for better logging
 *   expected  {Array}    expected states for a given accessible that have the
 *                        following format:
 *                          [
 *                            expected state,
 *                            expected extra state,
 *                            absent state,
 *                            absent extra state
 *                          ]
 *   attrs     {?Array}   an optional list of attributes to update
 * }
 */

// State caching tests for attribute changes
const attributeTests = [
  {
    desc:
      "Checkbox with @checked attribute set to true should have checked " +
      "state",
    attrs: [
      {
        attr: "checked",
        value: "true",
      },
    ],
    expected: [STATE_CHECKED, 0],
  },
  {
    desc: "Checkbox with no @checked attribute should not have checked state",
    attrs: [
      {
        attr: "checked",
      },
    ],
    expected: [0, 0, STATE_CHECKED],
  },
];

// State caching tests for ARIA changes
const ariaTests = [
  {
    desc: "File input has busy state when @aria-busy attribute is set to true",
    attrs: [
      {
        attr: "aria-busy",
        value: "true",
      },
    ],
    expected: [STATE_BUSY, 0, STATE_REQUIRED | STATE_INVALID],
  },
  {
    desc:
      "File input has required state when @aria-required attribute is set " +
      "to true",
    attrs: [
      {
        attr: "aria-required",
        value: "true",
      },
    ],
    expected: [STATE_REQUIRED, 0, STATE_INVALID],
  },
  {
    desc:
      "File input has invalid state when @aria-invalid attribute is set to " +
      "true",
    attrs: [
      {
        attr: "aria-invalid",
        value: "true",
      },
    ],
    expected: [STATE_INVALID, 0],
  },
];

// Extra state caching tests
const extraStateTests = [
  {
    desc:
      "Input has no extra enabled state when aria and native disabled " +
      "attributes are set at once",
    attrs: [
      {
        attr: "aria-disabled",
        value: "true",
      },
      {
        attr: "disabled",
        value: "true",
      },
    ],
    expected: [0, 0, 0, EXT_STATE_ENABLED],
  },
  {
    desc:
      "Input has an extra enabled state when aria and native disabled " +
      "attributes are unset at once",
    attrs: [
      {
        attr: "aria-disabled",
      },
      {
        attr: "disabled",
      },
    ],
    expected: [0, EXT_STATE_ENABLED],
  },
];

async function runStateTests(browser, accDoc, id, tests) {
  let acc = findAccessibleChildByID(accDoc, id);
  for (let { desc, attrs, expected } of tests) {
    const [expState, expExtState, absState, absExtState] = expected;
    info(desc);
    let onUpdate = waitForEvent(EVENT_STATE_CHANGE, evt => {
      if (getAccessibleDOMNodeID(evt.accessible) != id) {
        return false;
      }
      // Events can be fired for states other than the ones we're interested
      // in. If this happens, the states we're expecting might not be exposed
      // yet.
      const scEvt = evt.QueryInterface(nsIAccessibleStateChangeEvent);
      if (scEvt.isExtraState) {
        if (scEvt.state & expExtState || scEvt.state & absExtState) {
          return true;
        }
        return false;
      }
      return scEvt.state & expState || scEvt.state & absState;
    });
    for (let { attr, value } of attrs) {
      await invokeSetAttribute(browser, id, attr, value);
    }
    await onUpdate;
    testStates(acc, ...expected);
  }
}

/**
 * Test caching of accessible object states
 */
addAccessibleTask(
  `
  <input id="checkbox" type="checkbox">
  <input id="file" type="file">
  <input id="text">`,
  async function (browser, accDoc) {
    await runStateTests(browser, accDoc, "checkbox", attributeTests);
    await runStateTests(browser, accDoc, "file", ariaTests);
    await runStateTests(browser, accDoc, "text", extraStateTests);
  },
  { iframe: true, remoteIframe: true }
);

/**
 * Test caching of the focused state.
 */
addAccessibleTask(
  `
  <button id="b1">b1</button>
  <button id="b2">b2</button>
  `,
  async function (browser, docAcc) {
    const b1 = findAccessibleChildByID(docAcc, "b1");
    const b2 = findAccessibleChildByID(docAcc, "b2");

    let focused = waitForEvent(EVENT_FOCUS, b1);
    await invokeFocus(browser, "b1");
    await focused;
    testStates(docAcc, 0, 0, STATE_FOCUSED);
    testStates(b1, STATE_FOCUSED);
    testStates(b2, 0, 0, STATE_FOCUSED);

    focused = waitForEvent(EVENT_FOCUS, b2);
    await invokeFocus(browser, "b2");
    await focused;
    testStates(b2, STATE_FOCUSED);
    testStates(b1, 0, 0, STATE_FOCUSED);
  },
  { iframe: true, remoteIframe: true }
);

/**
 * Test that the document initially gets the focused state.
 * We can't do this in the test above because that test runs in iframes as well
 * as a top level document.
 */
addAccessibleTask(
  `
  <button id="b1">b1</button>
  <button id="b2">b2</button>
  `,
  async function (browser, docAcc) {
    testStates(docAcc, STATE_FOCUSED);
  }
);

/**
 * Test caching of the focused state in iframes.
 */
addAccessibleTask(
  `
  <button id="button">button</button>
  `,
  async function (browser, iframeDocAcc, topDocAcc) {
    testStates(topDocAcc, STATE_FOCUSED);
    const button = findAccessibleChildByID(iframeDocAcc, "button");
    testStates(button, 0, 0, STATE_FOCUSED);
    let focused = waitForEvent(EVENT_FOCUS, button);
    info("Focusing button in iframe");
    button.takeFocus();
    await focused;
    testStates(topDocAcc, 0, 0, STATE_FOCUSED);
    testStates(button, STATE_FOCUSED);
  },
  { topLevel: false, iframe: true, remoteIframe: true }
);

/**
 * Test caching of the focusable state in iframes which are initially visibility: hidden.
 */
addAccessibleTask(
  `
<button id="button"></button>
<span id="span" tabindex="-1">span</span>`,
  async function (browser, topDocAcc) {
    info("Changing visibility on iframe");
    let reordered = waitForEvent(EVENT_REORDER, topDocAcc);
    await SpecialPowers.spawn(browser, [DEFAULT_IFRAME_ID], iframeId => {
      content.document.getElementById(iframeId).style.visibility = "";
    });
    await reordered;
    // The iframe doc a11y tree might not be built yet.
    const iframeDoc = await TestUtils.waitForCondition(() =>
      findAccessibleChildByID(topDocAcc, DEFAULT_IFRAME_DOC_BODY_ID)
    );
    // Log/verify whether this is an in-process or OOP iframe.
    await comparePIDs(browser, gIsRemoteIframe);
    const button = findAccessibleChildByID(iframeDoc, "button");
    testStates(button, STATE_FOCUSABLE);
    const span = findAccessibleChildByID(iframeDoc, "span");
    ok(span, "span Accessible exists");
    testStates(span, STATE_FOCUSABLE);
  },
  {
    topLevel: false,
    iframe: true,
    remoteIframe: true,
    iframeAttrs: { style: "visibility: hidden;" },
    skipFissionDocLoad: true,
  }
);

function checkOpacity(acc, present) {
  let [, extraState] = getStates(acc);
  let currOpacity = extraState & EXT_STATE_OPAQUE;
  return present ? currOpacity : !currOpacity;
}

/**
 * Test caching of the OPAQUE1 state.
 */
addAccessibleTask(
  `
  <div id="div">hello world</div>
  `,
  async function (browser, docAcc) {
    const div = findAccessibleChildByID(docAcc, "div");
    await untilCacheOk(() => checkOpacity(div, true), "Found opaque state");

    await invokeContentTask(browser, [], () => {
      let elm = content.document.getElementById("div");
      elm.style = "opacity: 0.4;";
      elm.offsetTop; // Flush layout.
    });

    await untilCacheOk(
      () => checkOpacity(div, false),
      "Did not find opaque state"
    );

    await invokeContentTask(browser, [], () => {
      let elm = content.document.getElementById("div");
      elm.style = "opacity: 1;";
      elm.offsetTop; // Flush layout.
    });

    await untilCacheOk(() => checkOpacity(div, true), "Found opaque state");
  },
  { iframe: true, remoteIframe: true, chrome: true }
);

/**
 * Test caching of the editable state.
 */
addAccessibleTask(
  `<div id="div" contenteditable></div>`,
  async function (browser, docAcc) {
    const div = findAccessibleChildByID(docAcc, "div");
    testStates(div, 0, EXT_STATE_EDITABLE, 0, 0);
    // Ensure that a contentEditable descendant doesn't cause editable to be
    // exposed on the document.
    testStates(docAcc, STATE_READONLY, 0, 0, EXT_STATE_EDITABLE);

    info("Setting contentEditable on the body");
    let stateChanged = Promise.all([
      waitForStateChange(docAcc, EXT_STATE_EDITABLE, true, true),
      waitForStateChange(docAcc, STATE_READONLY, false, false),
    ]);
    await invokeContentTask(browser, [], () => {
      content.document.body.contentEditable = true;
    });
    await stateChanged;
    testStates(docAcc, 0, EXT_STATE_EDITABLE, STATE_READONLY, 0);

    info("Clearing contentEditable on the body");
    stateChanged = Promise.all([
      waitForStateChange(docAcc, EXT_STATE_EDITABLE, false, true),
      waitForStateChange(docAcc, STATE_READONLY, true, false),
    ]);
    await invokeContentTask(browser, [], () => {
      content.document.body.contentEditable = false;
    });
    await stateChanged;
    testStates(docAcc, STATE_READONLY, 0, 0, EXT_STATE_EDITABLE);

    info("Clearing contentEditable on div");
    stateChanged = waitForStateChange(div, EXT_STATE_EDITABLE, false, true);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("div").contentEditable = false;
    });
    await stateChanged;
    testStates(div, 0, 0, 0, EXT_STATE_EDITABLE);

    info("Setting contentEditable on div");
    stateChanged = waitForStateChange(div, EXT_STATE_EDITABLE, true, true);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("div").contentEditable = true;
    });
    await stateChanged;
    testStates(div, 0, EXT_STATE_EDITABLE, 0, 0);

    info("Setting designMode on document");
    stateChanged = Promise.all([
      waitForStateChange(docAcc, EXT_STATE_EDITABLE, true, true),
      waitForStateChange(docAcc, STATE_READONLY, false, false),
    ]);
    await invokeContentTask(browser, [], () => {
      content.document.designMode = "on";
    });
    await stateChanged;
    testStates(docAcc, 0, EXT_STATE_EDITABLE, STATE_READONLY, 0);

    info("Clearing designMode on document");
    stateChanged = Promise.all([
      waitForStateChange(docAcc, EXT_STATE_EDITABLE, false, true),
      waitForStateChange(docAcc, STATE_READONLY, true, false),
    ]);
    await invokeContentTask(browser, [], () => {
      content.document.designMode = "off";
    });
    await stateChanged;
    testStates(docAcc, STATE_READONLY, 0, 0, EXT_STATE_EDITABLE);
  },
  { topLevel: true, iframe: true, remoteIframe: true, chrome: true }
);

/**
 * Test caching of the stale and busy states.
 */
addAccessibleTask(
  `<iframe id="iframe"></iframe>`,
  async function (browser, docAcc) {
    const iframe = findAccessibleChildByID(docAcc, "iframe");
    info("Setting iframe src");
    // This iframe won't finish loading. Thus, it will get the stale state and
    // won't fire a document load complete event. We use the reorder event on
    // the iframe to know when the document has been created.
    let reordered = waitForEvent(EVENT_REORDER, iframe);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("iframe").src =
        'data:text/html,<img src="http://example.com/a11y/accessible/tests/mochitest/events/slow_image.sjs">';
    });
    const iframeDoc = (await reordered).accessible.firstChild;
    testStates(iframeDoc, STATE_BUSY, EXT_STATE_STALE, 0, 0);

    info("Finishing load of iframe doc");
    let loadCompleted = waitForEvent(EVENT_DOCUMENT_LOAD_COMPLETE, iframeDoc);
    await fetch(
      "https://example.com/a11y/accessible/tests/mochitest/events/slow_image.sjs?complete"
    );
    await loadCompleted;
    testStates(iframeDoc, 0, 0, STATE_BUSY, EXT_STATE_STALE);
  },
  { topLevel: true, chrome: true }
);

/**
 * Test implicit selected state.
 */
addAccessibleTask(
  `
<div role="tablist">
  <div id="noSel" role="tab" tabindex="0">noSel</div>
  <div id="selFalse" role="tab" aria-selected="false" tabindex="0">selFalse</div>
</div>
<div role="listbox" aria-multiselectable="true">
  <div id="multiNoSel" role="option" tabindex="0">multiNoSel</div>
</div>
  `,
  async function (browser, docAcc) {
    const noSel = findAccessibleChildByID(docAcc, "noSel");
    testStates(noSel, 0, 0, STATE_FOCUSED | STATE_SELECTED, 0);
    info("Focusing noSel");
    let focused = waitForEvent(EVENT_FOCUS, noSel);
    noSel.takeFocus();
    await focused;
    testStates(noSel, STATE_FOCUSED | STATE_SELECTED, 0, 0, 0);

    const selFalse = findAccessibleChildByID(docAcc, "selFalse");
    testStates(selFalse, 0, 0, STATE_FOCUSED | STATE_SELECTED, 0);
    info("Focusing selFalse");
    focused = waitForEvent(EVENT_FOCUS, selFalse);
    selFalse.takeFocus();
    await focused;
    testStates(selFalse, STATE_FOCUSED, 0, STATE_SELECTED, 0);

    const multiNoSel = findAccessibleChildByID(docAcc, "multiNoSel");
    testStates(multiNoSel, 0, 0, STATE_FOCUSED | STATE_SELECTED, 0);
    info("Focusing multiNoSel");
    focused = waitForEvent(EVENT_FOCUS, multiNoSel);
    multiNoSel.takeFocus();
    await focused;
    testStates(multiNoSel, STATE_FOCUSED, 0, STATE_SELECTED, 0);
  },
  { topLevel: true, iframe: true, remoteIframe: true, chrome: true }
);

/**
 * Test invalid state determined via DOM.
 */
addAccessibleTask(
  `<input type="email" id="email">`,
  async function (browser, docAcc) {
    const email = findAccessibleChildByID(docAcc, "email");
    info("Focusing email");
    let focused = waitForEvent(EVENT_FOCUS, email);
    email.takeFocus();
    await focused;
    info("Typing a");
    let invalidChanged = waitForStateChange(email, STATE_INVALID, true);
    EventUtils.sendString("a");
    await invalidChanged;
    testStates(email, STATE_INVALID);
    info("Typing @b");
    invalidChanged = waitForStateChange(email, STATE_INVALID, false);
    EventUtils.sendString("@b");
    await invalidChanged;
    testStates(email, 0, 0, STATE_INVALID);
    info("Typing backspace");
    invalidChanged = waitForStateChange(email, STATE_INVALID, true);
    EventUtils.synthesizeKey("KEY_Backspace");
    await invalidChanged;
    testStates(email, STATE_INVALID);
  },
  { chrome: true, topLevel: true, remoteIframe: true }
);

/**
 * Test caching of the expanded state for the popovertarget content attribute.
 */
addAccessibleTask(
  `
  <button id="show-popover-btn" popovertarget="mypopover" popovertargetaction="show">Show popover</button>
  <button id="hide-popover-btn" popovertarget="mypopover" popovertargetaction="hide">Hide popover</button>
  <button id="toggle">toggle</button>
  <div id="mypopover" popover>
    Popover content
    <button id="hide-inside" popovertarget="mypopover" popovertargetaction="hide">Hide inside popover</button>
  </div>
  `,
  async function (browser, docAcc) {
    const show = findAccessibleChildByID(docAcc, "show-popover-btn");
    const hide = findAccessibleChildByID(docAcc, "hide-popover-btn");
    testStates(show, STATE_COLLAPSED, 0);
    testStates(hide, STATE_COLLAPSED, 0);
    const toggle = findAccessibleChildByID(docAcc, "toggle");
    testStates(
      toggle,
      0,
      0,
      STATE_EXPANDED | STATE_COLLAPSED,
      EXT_STATE_EXPANDABLE
    );

    info("Setting toggle's popovertarget");
    let stateChanged = waitForStateChange(
      toggle,
      EXT_STATE_EXPANDABLE,
      true,
      true
    );
    await invokeContentTask(browser, [], () => {
      content.document
        .getElementById("toggle")
        .setAttribute("popovertarget", "mypopover");
    });
    await stateChanged;

    // Changes to the popover should fire events on all invokers.
    const changeEvents = [
      [EVENT_STATE_CHANGE, show],
      [EVENT_STATE_CHANGE, hide],
      [EVENT_STATE_CHANGE, toggle],
    ];
    info("Expanding popover");
    let onShowing = waitForEvents(changeEvents);
    await show.doAction(0);
    await onShowing;
    testStates(show, STATE_EXPANDED, 0);
    testStates(hide, STATE_EXPANDED, 0);
    testStates(toggle, STATE_EXPANDED, 0);
    const hideInside = findAccessibleChildByID(show, "hide-inside");
    testStates(hideInside, 0, 0, STATE_EXPANDED | STATE_COLLAPSED, 0);

    info("Collapsing popover");
    let onHiding = waitForEvents(changeEvents);
    await hide.doAction(0);
    await onHiding;
    testStates(hide, STATE_COLLAPSED, 0);
    testStates(show, STATE_COLLAPSED, 0);
    testStates(toggle, STATE_COLLAPSED, 0);
  },
  { chrome: true, topLevel: true, remoteIframe: true }
);

/**
 * Test caching of the expanded state for the popoverTargetElement WebIDL
 * attribute.
 */
addAccessibleTask(
  `
<button id="toggle1">toggle</button>
<div id="popover1" popover>popover1</div>
<button id="toggle2">toggle2</button>
<button id="toggle3">toggle3</button>
<div id="shadowHost"><template shadowrootmode="open">
  <button id="toggle4">toggle4</button>
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
  async function (browser, docAcc) {
    const toggle1 = findAccessibleChildByID(docAcc, "toggle1");
    // toggle1's popover target is set and connected to the document.
    testStates(toggle1, STATE_COLLAPSED);

    const toggle2 = findAccessibleChildByID(docAcc, "toggle2");
    // toggle2's popover target isn't set yet.
    testStates(
      toggle2,
      0,
      0,
      STATE_EXPANDED | STATE_COLLAPSED,
      EXT_STATE_EXPANDABLE
    );
    info("Setting toggle2's popoverTargetElement");
    let changed = waitForStateChange(toggle2, EXT_STATE_EXPANDABLE, true, true);
    await invokeContentTask(browser, [], () => {
      const toggle2Dom = content.document.getElementById("toggle2");
      const popover1 = content.document.getElementById("popover1");
      toggle2Dom.popoverTargetElement = popover1;
    });
    await changed;
    testStates(toggle2, STATE_COLLAPSED);

    const toggle5 = findAccessibleChildByID(docAcc, "toggle5");
    // toggle5 is inside the shadow DOM and popover1 is outside, so the target
    // is valid.
    testStates(toggle5, STATE_COLLAPSED);

    // Changes to the popover should fire events on all invokers.
    const changeEvents = [
      [EVENT_STATE_CHANGE, toggle1],
      [EVENT_STATE_CHANGE, toggle2],
      [EVENT_STATE_CHANGE, toggle5],
    ];
    info("Showing popover1");
    changed = waitForEvents(changeEvents);
    toggle1.doAction(0);
    await changed;
    testStates(toggle1, STATE_EXPANDED);
    testStates(toggle2, STATE_EXPANDED);

    info("Hiding popover1");
    changed = waitForEvents(changeEvents);
    toggle1.doAction(0);
    await changed;
    testStates(toggle1, STATE_COLLAPSED);
    testStates(toggle2, STATE_COLLAPSED);

    info("Clearing toggle1's popover target");
    changed = waitForStateChange(toggle1, EXT_STATE_EXPANDABLE, false, true);
    await invokeContentTask(browser, [], () => {
      const toggle1Dom = content.document.getElementById("toggle1");
      toggle1Dom.popoverTargetElement = null;
    });
    await changed;
    testStates(
      toggle1,
      0,
      0,
      STATE_EXPANDED | STATE_COLLAPSED,
      EXT_STATE_EXPANDABLE
    );

    info("Setting toggle2's popover target to a disconnected node");
    changed = waitForStateChange(toggle2, EXT_STATE_EXPANDABLE, false, true);
    await invokeContentTask(browser, [], () => {
      const toggle2Dom = content.document.getElementById("toggle2");
      const popover3 = content.document.createElement("div");
      popover3.popover = "auto";
      popover3.textContent = "popover3";
      // We don't append popover3 anywhere, so it is disconnected.
      toggle2Dom.popoverTargetElement = popover3;
    });
    await changed;
    testStates(
      toggle2,
      0,
      0,
      STATE_EXPANDED | STATE_COLLAPSED,
      EXT_STATE_EXPANDABLE
    );

    const toggle3 = findAccessibleChildByID(docAcc, "toggle3");
    // toggle3 is outside popover2's shadow DOM, so the target isn't valid.
    testStates(
      toggle3,
      0,
      0,
      STATE_EXPANDED | STATE_COLLAPSED,
      EXT_STATE_EXPANDABLE
    );
    const toggle4 = findAccessibleChildByID(docAcc, "toggle4");
    // toggle4 is in the same shadow DOM as popover2.
    testStates(toggle4, STATE_COLLAPSED);
  },
  { chrome: true, topLevel: true }
);

/**
 * Test the mixed state of indeterminate HTML checkboxes.
 */
addAccessibleTask(
  `<input type="checkbox" id="checkbox">`,
  async function testHTMLCheckboxMixed(browser, docAcc) {
    const checkbox = findAccessibleChildByID(docAcc, "checkbox");
    testStates(checkbox, 0, 0, STATE_MIXED);
    info("Setting indeterminate on checkbox");
    let changed = waitForStateChange(checkbox, STATE_MIXED, true);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("checkbox").indeterminate = true;
    });
    await changed;
    testStates(checkbox, STATE_MIXED);
    info("Clearing indeterminate on checkbox");
    changed = waitForStateChange(checkbox, STATE_MIXED, false);
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("checkbox").indeterminate = false;
    });
    await changed;
    testStates(checkbox, 0, 0, STATE_MIXED);
  },
  { chrome: true, topLevel: true, iframe: true, remoteIframe: true }
);
