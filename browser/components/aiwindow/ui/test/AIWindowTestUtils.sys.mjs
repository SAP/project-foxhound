/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BrowserTestUtils } from "resource://testing-common/BrowserTestUtils.sys.mjs";

export const AIWindowTestUtils = {
  async toggleAIWindowPref(SpecialPowers, enabled) {
    await SpecialPowers.pushPrefEnv({
      set: [["browser.smartwindow.enabled", enabled]],
    });
  },

  isAIWindow(win) {
    return win.document.documentElement.hasAttribute("ai-window");
  },

  async openAIWindow(aiWindow = true) {
    return BrowserTestUtils.openNewBrowserWindow({
      openerWindow: null,
      aiWindow,
    });
  },
};
