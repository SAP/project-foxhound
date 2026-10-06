/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

addAccessibleTask(
  `<dialog id="modal">I am a modal dialog</dialog>`,
  async function testModal(browser, _docAcc) {
    info("Showing modal");
    let shown = waitForEvent(EVENT_SHOW, "modal");
    await invokeContentTask(browser, [], () => {
      content.document.getElementById("modal").showModal();
    });
    const modal = (await shown).accessible;
    testStates(modal, 0, EXT_STATE_MODAL);
  },
  { chrome: true, topLevel: true }
);

addAccessibleTask(
  `<dialog id="nonmodal" open>I am a non-modal dialog</dialog>`,
  async function testNonModal(browser, docAcc) {
    const nonmodal = findAccessibleChildByID(docAcc, "nonmodal");
    testStates(nonmodal, 0, 0, 0, EXT_STATE_MODAL);
  },
  { chrome: true, topLevel: true }
);
