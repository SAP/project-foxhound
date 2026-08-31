/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test basic press action.
 */
addAccessibleTask(
  `
<button id="btn" onclick="this.textContent = 'Clicked'">Click me</button>
  `,
  async function testBasicPress() {
    const actions = await runPython(`
      global doc
      doc = getDoc()
      global btn
      btn = findByDomId(doc, "btn").queryAction()
      return str([[btn.getName(i), btn.getLocalizedName(i), btn.getDescription(i)] for i in range(btn.get_nActions())])
    `);
    is(actions, "[['press', 'Press', 'Press']]", "btn has correct actions");

    const nameChanged = waitForEvent(EVENT_NAME_CHANGE, "btn");
    await runPython(`
      btn.doAction(0)
    `);
    await nameChanged;
  }
);

/**
 * Test aria-actions.
 */
addAccessibleTask(
  `
  <div id="container">
    <dialog aria-actions="btn1" id="dlg1" open>
      Hello
      <form method="dialog">
        <button id="btn1">Close</button>
      </form>
    </dialog>
    <dialog aria-actions="btn2" id="dlg2" onclick="" open>
      Dialog with its own click listener
      <form method="dialog">
        <button id="btn2">Close</button>
      </form>
    </dialog>
  </div>`,
  async function testAriaActions() {
    let actions = await runPython(`
      global doc
      doc = getDoc()
      global dlg1
      dlg1 = findByDomId(doc, "dlg1").queryAction()
      return str([[dlg1.getName(i), dlg1.getLocalizedName(i), dlg1.getDescription(i)] for i in range(dlg1.get_nActions())])
    `);
    is(
      actions,
      "[['custom_btn1', 'Close', 'Close']]",
      "dlg1 has correct actions"
    );

    let reorder = waitForEvent(EVENT_REORDER, "container");
    await runPython(`
      dlg1.doAction(0)
    `);
    await reorder;

    // Test dialog with its own click listener, and therefore has the aria-actions
    // target actions appended to its own actions.
    actions = await runPython(`
      global dlg2
      dlg2 = findByDomId(doc, "dlg2").queryAction()
      return str([[dlg2.getName(i), dlg2.getLocalizedName(i), dlg2.getDescription(i)] for i in range(dlg2.get_nActions())])
    `);
    is(
      actions,
      "[['click', 'Click', 'Click'], ['custom_btn2', 'Close', 'Close']]",
      "dlg2 has correct actions"
    );

    reorder = waitForEvent(EVENT_REORDER, "container");
    await runPython(`
      dlg2.doAction(1)
    `);
    await reorder;
  }
);
