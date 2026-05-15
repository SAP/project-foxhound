/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Tests for CacheKey::PopoverInvokerIsDetails, CacheDomain::Relations
//
// The PopoverInvokerIsDetails key is set when a popovertarget establishes
// either a DETAILS relation (non-hint popovers, or open hint popovers with
// interactive descendants) or DESCRIBED_BY relation (open hint popovers without
// interactive descendants).

// popover="auto" establishes a DETAILS relation when shown.
addAccessibleTask(
  `
  <button id="invoker" popovertarget="popover">Open</button>
  <p></p>
  <div id="popover" popover="auto">Popover content</div>
`,
  async function (browser, docAcc) {
    let acc = findAccessibleChildByID(docAcc, "invoker");
    // Show the popover so it can establish a relation.
    let shown = waitForEvent(EVENT_SHOW, "popover");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("popover").showPopover();
    });
    await shown;
    await testAttributeCachePresence(acc, "details", () => {
      acc.getRelationByType(0);
    });
  },
  {
    topLevel: true,
    iframe: true,
    remoteIframe: true,
    cacheDomains: CacheDomain.None,
  }
);

// popover="manual" establishes a DETAILS relation when shown.
addAccessibleTask(
  `
  <button id="invoker" popovertarget="popover">Open</button>
  <p></p>
  <div id="popover" popover="manual">Popover content</div>
`,
  async function (browser, docAcc) {
    let acc = findAccessibleChildByID(docAcc, "invoker");
    // Show the popover so it can establish a relation.
    let shown = waitForEvent(EVENT_SHOW, "popover");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("popover").showPopover();
    });
    await shown;
    await testAttributeCachePresence(acc, "details", () => {
      acc.getRelationByType(0);
    });
  },
  {
    topLevel: true,
    iframe: true,
    remoteIframe: true,
    cacheDomains: CacheDomain.None,
  }
);

// popover="hint" when open with interactive descendants establishes a DETAILS
// relation.
addAccessibleTask(
  `
  <button id="invoker" popovertarget="popover">Open</button>
  <p></p>
  <div id="popover" popover="hint"><button>Interactive</button></div>
`,
  async function (browser, docAcc) {
    let acc = findAccessibleChildByID(docAcc, "invoker");
    // Show the hint popover so it can establish a relation.
    let shown = waitForEvent(EVENT_SHOW, "popover");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("popover").showPopover();
    });
    await shown;
    await testAttributeCachePresence(acc, "details", () => {
      acc.getRelationByType(0);
    });
  },
  {
    topLevel: true,
    iframe: true,
    remoteIframe: true,
    cacheDomains: CacheDomain.None,
  }
);

// popover="hint" when open without interactive descendants establishes a
// DESCRIBED_BY relation.
addAccessibleTask(
  `
  <button id="invoker" popovertarget="popover">Open</button>
  <p></p>
  <div id="popover" popover="hint">Non-interactive content</div>
`,
  async function (browser, docAcc) {
    let acc = findAccessibleChildByID(docAcc, "invoker");
    // Show the hint popover so it can establish a relation.
    let shown = waitForEvent(EVENT_SHOW, "popover");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("popover").showPopover();
    });
    await shown;

    acc.getRelationByType(0);
    let hasAttribute;
    try {
      acc.cache.getStringProperty("details");
      hasAttribute = true;
    } catch (e) {
      hasAttribute = false;
    }
    ok(!hasAttribute, "details key is not cached for DESCRIBED_BY relation");
  },
  {
    topLevel: true,
    iframe: true,
    remoteIframe: true,
    cacheDomains: CacheDomain.None,
  }
);
