/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { PrivateBrowsingUtils } from "resource://gre/modules/PrivateBrowsingUtils.sys.mjs";
import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { PanelMultiView } from "moz-src:///browser/components/customizableui/PanelMultiView.sys.mjs";

// Note that this is also called from non-browser windows on OSX, which do
// share menu items but not much else. See nonbrowser-mac.js.
export const PrivateBrowsingUI = {
  init: function PBUI_init(window) {
    const document = window.document;
    const gBrowser = window.gBrowser;

    // Disable the Clear Recent History... menu item when in PB mode
    // temporary fix until bug 463607 is fixed
    document.getElementById("Tools:Sanitize").setAttribute("disabled", "true");

    if (window.location.href != AppConstants.BROWSER_CHROME_URL) {
      return;
    }

    // Adjust the window's title
    let docElement = document.documentElement;
    docElement.setAttribute(
      "privatebrowsingmode",
      PrivateBrowsingUtils.permanentPrivateBrowsing ? "permanent" : "temporary"
    );

    gBrowser.updateTitlebar();

    if (PrivateBrowsingUtils.permanentPrivateBrowsing) {
      let hideNewWindowItem = (windowItem, privateWindowItem) => {
        // In permanent browsing mode command "cmd_newNavigator" should act the
        // same as "Tools:PrivateBrowsing".
        // So we hide the redundant private window item. But we also rename the
        // "new window" item to be "new private window".
        // NOTE: We choose to hide privateWindowItem rather than windowItem so
        // that we still show the "key" for "cmd_newNavigator" (Ctrl+N) rather
        // than (Ctrl+Shift+P).
        privateWindowItem.hidden = true;
        windowItem.setAttribute(
          "data-l10n-id",
          privateWindowItem.getAttribute("data-l10n-id")
        );
      };

      // Adjust the File menu items.
      hideNewWindowItem(
        document.getElementById("menu_newNavigator"),
        document.getElementById("menu_newPrivateWindow")
      );
      // Adjust the App menu items.
      hideNewWindowItem(
        PanelMultiView.getViewNode(document, "appMenu-new-window-button2"),
        PanelMultiView.getViewNode(
          document,
          "appMenu-new-private-window-button2"
        )
      );
    }
  },
};
