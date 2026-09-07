/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/* import-globals-from ../../mochitest/role.js */
/* import-globals-from ../../mochitest/states.js */
loadScripts(
  { name: "role.js", dir: MOCHITESTS_DIR },
  { name: "states.js", dir: MOCHITESTS_DIR }
);

// Test custom action
addAccessibleTask(
  `<div id="container">
    <dialog aria-actions="btn" id="dlg" open>
    Hello
    <form method="dialog">
      <button id="btn">Close</button>
    </form>
    </dialog>
  </div>`,
  async (browser, accDoc) => {
    let dialog = getNativeInterface(accDoc, "dlg");
    let actionNames = dialog.actionNames;
    let customAction = actionNames.find(name => name.startsWith("Name:Close"));
    ok(!!customAction, "Dialog should have a custom action");
    is(
      dialog.getActionDescription(customAction),
      "Close",
      "Correct action description"
    );

    const reorder = waitForEvent(EVENT_REORDER, "container");
    dialog.performAction(customAction);
    await reorder;
  }
);
