/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

for (const attributeName of ["popovertarget", "commandfor"]) {
  const commandAttr =
    attributeName === "commandfor" ? ' command="toggle-popover"' : "";
  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">Simple tooltip text</div>
    `,
    async function testHintPopoverDescribedBy(browser, docAcc) {
      info(
        `Test 1 (${attributeName}): Non-rich hint popover should establish DESCRIBED_BY relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, []);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, []);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, [hint]);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, [invoker]);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<div id="hint" popover="hint">Simple tooltip text</div>
    `,
    async function testHintPopoverDescribedByAdjacent(browser, docAcc) {
      info(
        `Test 2 (${attributeName}): Non-rich hint adjacent popover should establish DESCRIBED_BY relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, []);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, []);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, [hint]);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, [invoker]);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="Image">
</div>
    `,
    async function testHintPopoverDescribedByImage(browser, docAcc) {
      info(
        `Test 3 (${attributeName}): Hint popover with only image should establish DESCRIBED_BY relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, []);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, []);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, [hint]);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, [invoker]);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">Tooltip with <button>action</button></div>
    `,
    async function testHintPopoverDetailsButton(browser, docAcc) {
      info(
        `Test 4 (${attributeName}): Hint popover with button should establish DETAILS relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, hint);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, invoker);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">Tooltip with <a href="#">link</a></div>
    `,
    async function testHintPopoverDetailsLink(browser, docAcc) {
      info(
        `Test 5 (${attributeName}): Hint popover with link should establish DETAILS relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, hint);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, invoker);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">
  <table><tr><td>Cell content</td></tr></table>
</div>
    `,
    async function testHintPopoverDetailsTable(browser, docAcc) {
      info(
        `Test 6 (${attributeName}): Hint popover with table should establish DETAILS relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, hint);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, invoker);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<p></p>
<div id="hint" popover="hint">
  <ul><li>List item</li></ul>
</div>
    `,
    async function testHintPopoverDetailsList(browser, docAcc) {
      info(
        `Test 7 (${attributeName}): Hint popover with list should establish DETAILS relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, hint);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, invoker);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="invoker" ${attributeName}="hint"${commandAttr}>Show hint</button>
<div id="hint" popover="hint">Tooltip with <button>action</button></div>
    `,
    async function testHintPopoverDetailsAdjacent(browser, docAcc) {
      info(
        `Test 8 (${attributeName}): Rich hint ADJACENT popover with button should NOT establish DETAILS relation`
      );
      const invoker = findAccessibleChildByID(docAcc, "invoker");
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);

      const shown = waitForEvent(EVENT_SHOW, "hint");
      invoker.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(invoker, RELATION_DETAILS, []);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, []);
      await testCachedRelation(invoker, RELATION_DESCRIBED_BY, []);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="toggle" ${attributeName}="hint"${commandAttr}>Toggle hint</button>
<p></p>
<div id="hint" popover="hint">Simple tooltip text</div>
    `,
    async function testHintPopoverDescribedByClose(browser, docAcc) {
      info(
        `Test 9 (${attributeName}): DESCRIBED_BY relation should be cleared when popover closes`
      );
      const toggle = findAccessibleChildByID(docAcc, "toggle");

      const shown = waitForEvent(EVENT_SHOW, "hint");
      toggle.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(toggle, RELATION_DESCRIBED_BY, [hint]);
      await testCachedRelation(hint, RELATION_DESCRIPTION_FOR, [toggle]);

      const hidden = waitForEvent(EVENT_HIDE, hint);
      await invokeContentTask(browser, ["hint"], id => {
        content.document.getElementById(id).hidePopover();
      });
      await hidden;
      await testCachedRelation(toggle, RELATION_DESCRIBED_BY, []);
    },
    { chrome: true, topLevel: true }
  );

  addAccessibleTask(
    `
<button id="toggle" ${attributeName}="hint"${commandAttr}>Toggle hint</button>
<p></p>
<div id="hint" popover="hint">Tooltip with <button>action</button></div>
    `,
    async function testHintPopoverDetailsClose(browser, docAcc) {
      info(
        `Test 10 (${attributeName}): DETAILS relation should be cleared when popover closes`
      );
      const toggle = findAccessibleChildByID(docAcc, "toggle");

      const shown = waitForEvent(EVENT_SHOW, "hint");
      toggle.doAction(0);
      const hint = (await shown).accessible;
      await testCachedRelation(toggle, RELATION_DETAILS, hint);
      await testCachedRelation(hint, RELATION_DETAILS_FOR, toggle);

      const hidden = waitForEvent(EVENT_HIDE, hint);
      await invokeContentTask(browser, ["hint"], id => {
        content.document.getElementById(id).hidePopover();
      });
      await hidden;
      await testCachedRelation(toggle, RELATION_DETAILS, []);
    },
    { chrome: true, topLevel: true }
  );
}
