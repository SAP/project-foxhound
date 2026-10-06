/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test that native HTML table cells are not selectable by default.
 */
addAccessibleTask(
  `
  <table id="native_table">
    <tr>
      <td id="native_cell">Native cell</td>
    </tr>
  </table>
  `,
  async function (browser, docAcc) {
    const nativeCell = findAccessibleChildByID(docAcc, "native_cell");
    testStates(nativeCell, 0, 0, STATE_SELECTABLE, 0);
  },
  { topLevel: true, iframe: true, remoteIframe: true, chrome: true }
);
