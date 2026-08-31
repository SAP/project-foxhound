/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * Test that the accessibility engine correctly sets the Windows system caret.
 * We already have cross-platform tests for GetCaretRect in
 * accessible/tests/browser/bounds/browser_caret_rect.js.
 * Thus, these tests are not extensive and are only to verify that the Windows
 * system caret matches GetCaretRect.
 */
addAccessibleTask(
  `<input id="input">`,
  async function testSystemCaret(browser, docAcc) {
    const input = findAccessibleChildByID(docAcc, "input", [nsIAccessibleText]);
    info("Focusing input");
    let moved = waitForEvent(EVENT_TEXT_CARET_MOVED, input);
    input.takeFocus();
    await moved;
    const geckoX = {};
    const geckoY = {};
    const geckoW = {};
    const geckoH = {};
    input.getCaretRect(geckoX, geckoY, geckoW, geckoH);
    // Windows proxies the OS caret via MSAA OBJID_CARET. This is the easiest
    // way to query the OS caret.
    const sysRect = await runPython(`
      hwnd = getFirefoxHwnd()
      caret = AccessibleObjectFromWindow(hwnd, OBJID_CARET)
      return caret.accLocation(CHILDID_SELF)
    `);
    is(sysRect[0], geckoX.value, "sysX == geckoX");
    is(sysRect[1], geckoY.value, "sysY == geckoY");
    is(sysRect[2], geckoW.value, "sysW == geckoW");
    is(sysRect[3], geckoH.value, "sysH == geckoH");
  },
  { chrome: true, topLevel: true, iframe: true, remoteIframe: true }
);
